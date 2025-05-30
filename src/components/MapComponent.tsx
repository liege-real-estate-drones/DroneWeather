"use client";

import { memo, useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, MapMouseEvent, useMap, useMapsLibrary, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import type { Coordinates, ArcGISFeatureProperties } from '@/types';
import type { FeatureCollection as GeoJSONFeatureCollection } from 'geojson';

interface MapCircleOverlayProps {
  center: google.maps.LatLngLiteral;
  radius: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
  fillColor: string;
  fillOpacity: number;
}

function MapCircleOverlay({
  center,
  radius,
  strokeColor,
  strokeOpacity,
  strokeWeight,
  fillColor,
  fillOpacity,
}: MapCircleOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) {
      return;
    }

    if (!circle) {
      const newCircle = new mapsLib.Circle({
        map,
        center,
        radius,
        strokeColor,
        strokeOpacity,
        strokeWeight,
        fillColor,
        fillOpacity,
        clickable: false,
      });
      setCircle(newCircle);
    } else {
      circle.setOptions({
        center,
        radius,
        strokeColor,
        strokeOpacity,
        strokeWeight,
        fillColor,
        fillOpacity,
      });
    }
    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
  }, [map, mapsLib, circle, center, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null;
}

interface MapComponentInternalProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  selectedCoordsForMarker: Coordinates | null;
  uavZonesData?: GeoJSONFeatureCollection | null;
  showUAVZones: boolean;
}

function MapComponentInternal({
  center,
  zoom,
  selectedCoordsForMarker,
  uavZonesData,
  showUAVZones,
}: MapComponentInternalProps) {
  const map = useMap();
  // CORRECTION 1: Charger les bibliothèques séparément
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const [uavDataLayer, setUavDataLayer] = useState<google.maps.Data | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    // CORRECTION 1 (suite): Attendre que les bibliothèques soient chargées
    if (!map || !mapsLib || !geometryLib) return;

    let currentDataLayer = uavDataLayer;
    if (!currentDataLayer) {
      currentDataLayer = new mapsLib.Data({ map }); // Utiliser mapsLib chargé
      setUavDataLayer(currentDataLayer);
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new mapsLib.InfoWindow(); // Utiliser mapsLib chargé
    }
    const localInfoWindow = infoWindowRef.current;

    if (showUAVZones && uavZonesData && currentDataLayer) {
      currentDataLayer.forEach(feature => currentDataLayer!.remove(feature));
      currentDataLayer.addGeoJson(uavZonesData);

      currentDataLayer.setStyle(feature => {
        let color = 'hsl(var(--muted))';
        let fOpacity = 0.20;
        const category = feature.getProperty('categoryType')?.toString().toUpperCase();
        const status = feature.getProperty('status')?.toString().toUpperCase();
        
        if (status === 'PROHIBITED') {
            color = 'hsl(var(--destructive))';
            fOpacity = 0.35;
        } else if (status === 'RESTRICTED') {
            color = 'hsl(var(--accent))';
            fOpacity = 0.30;
        } else if (category) {
            if (category.includes('P-') || category === 'PROHIBITED') {
                color = 'hsl(var(--destructive))';
                fOpacity = 0.35;
            } else if (category.includes('R-') || category === 'RESTRICTED') {
                color = 'hsl(var(--accent))';
                fOpacity = 0.30;
            } else if (category.includes('D-') || category === 'DANGER') {
                color = 'hsl(var(--primary))';
                fOpacity = 0.25;
            } else if (category.includes('TRA') || category.includes('TSA')) {
                color = 'hsl(260, 70%, 60%)';
                fOpacity = 0.25;
            } else if (category.includes('CTR') || category.includes('RMZ') || category.includes('TMZ')) {
                color = 'hsl(120, 60%, 45%)';
                fOpacity = 0.20;
            } else if (category.includes('NUCLEAR')) {
                color = 'hsl(50, 100%, 50%)';
                fOpacity = 0.30;
            } else if (category.includes('PRISON')) {
                color = 'hsl(0, 0%, 40%)';
                fOpacity = 0.30;
            }
        }

        return {
          fillColor: color,
          strokeColor: color,
          strokeWeight: 0.7,
          fillOpacity: fOpacity,
          clickable: true,
        };
      });

      google.maps.event.clearInstanceListeners(currentDataLayer);

      currentDataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
        if (!map || !localInfoWindow || !event.latLng || !currentDataLayer || !geometryLib || !mapsLib) return; // Vérifier mapsLib aussi

        const clickedLatLng = event.latLng;
        const featuresAtLocation: google.maps.Data.Feature[] = [];

        currentDataLayer.forEach((feature: google.maps.Data.Feature) => {
          const geom = feature.getGeometry();
          if (!geom) return;

          let isContained = false;
          const geomType = geom.getType();

          const processDataPolygon = (dataPolygon: google.maps.Data.Polygon) => {
            const rings = dataPolygon.getArray();
            if (rings.length > 0) {
              const googleMapsPolygonPaths: google.maps.LatLng[][] = [];
              rings.forEach(linearRing => {
                googleMapsPolygonPaths.push(linearRing.getArray());
              });
              const mapPolygon = new mapsLib.Polygon({ paths: googleMapsPolygonPaths }); // Utiliser mapsLib chargé
              if (geometryLib.poly.containsLocation(clickedLatLng, mapPolygon)) { // Utiliser geometryLib chargé
                isContained = true;
              }
            }
          };
          
          if (geomType === 'Polygon') {
            processDataPolygon(geom as google.maps.Data.Polygon);
          } else if (geomType === 'MultiPolygon') {
            const multiPoly = geom as google.maps.Data.MultiPolygon;
            multiPoly.getArray().forEach(dataPolygon => {
              processDataPolygon(dataPolygon);
              if (isContained) return;
            });
          }

          if (isContained) {
            featuresAtLocation.push(feature);
          }
        });

        if (featuresAtLocation.length === 0 && event.feature) {
          featuresAtLocation.push(event.feature);
        }

        if (featuresAtLocation.length > 0) {
          let contentString = `<div style="font-family: var(--font-geist-sans, sans-serif); font-size: 0.8rem; max-width: 300px; max-height: 350px; overflow-y: auto; padding-right: 10px; line-height: 1.4;">`;

          if (featuresAtLocation.length > 1) {
            contentString += `<h4 style="font-weight: 600; margin-bottom: 0.4rem; color: hsl(var(--primary));">${featuresAtLocation.length} zones à cet emplacement :</h4><ul style="padding-left: 20px; margin-top: 0.3rem; margin-bottom: 0.7rem;">`;
            featuresAtLocation.forEach((feat, index) => {
              const featureName = feat.getProperty('name') || `Zone Inconnue ${index + 1}`;
              contentString += `<li style="margin-bottom: 0.3rem;">${featureName}</li>`;
            });
            contentString += `</ul><hr style="margin: 0.5rem 0;" />`;
            
            // CORRECTION 3: Utiliser getProperty pour accéder aux propriétés
            const firstFeatName = featuresAtLocation[0].getProperty('name') || 'N/A';
            contentString += `<p style="font-size:0.7rem; margin-bottom:0.3rem; font-style:italic;">Détails pour : ${firstFeatName}</p>`;
            
            const detailsFeat = featuresAtLocation[0];
            const featureName = detailsFeat.getProperty('name') || 'N/A';
            const categoryType = detailsFeat.getProperty('categoryType') || 'N/A';
            const status = detailsFeat.getProperty('status') || 'N/A';
            const restriction = detailsFeat.getProperty('restriction') || 'N/A';
            const lowerLimit = detailsFeat.getProperty('lowerLimit');
            const lowerAltitudeUnit = detailsFeat.getProperty('lowerAltitudeUnit') || 'ft';
            const upperLimit = detailsFeat.getProperty('upperLimit');
            const upperAltitudeUnit = detailsFeat.getProperty('upperAltitudeUnit') || 'ft';
            const reason = detailsFeat.getProperty('reason') || 'N/A';
            const additionalInfo = detailsFeat.getProperty('additionalInfo') || 'N/A';

            const lowerLimitDisplay = (lowerLimit !== null && lowerLimit !== undefined) ? `${Math.round(Number(lowerLimit))} ${lowerAltitudeUnit}` : 'N/A';
            const upperLimitDisplay = (upperLimit !== null && upperLimit !== undefined) ? `${Math.round(Number(upperLimit))} ${upperAltitudeUnit}` : 'N/A';
                
            const infoMap = new globalThis.Map([
                ['Catégorie', categoryType], ['Statut', status], ['Limite Inf.', lowerLimitDisplay], ['Limite Sup.', upperLimitDisplay],
                ['Restriction', restriction], ['Raison', reason], ['Infos Add.', additionalInfo],
            ]);
            infoMap.forEach((value, key) => {
                if (value && String(value).trim() !== '' && String(value).trim().toUpperCase() !== 'N/A') {
                    contentString += `<p style="margin: 0.2rem 0;"><strong>${key}:</strong> ${value}</p>`;
                }
            });

          } else { // Une seule zone trouvée
            const feat = featuresAtLocation[0];
            // CORRECTION 3: Utiliser getProperty pour accéder aux propriétés
            const featureName = feat.getProperty('name') || 'N/A';
            const categoryType = feat.getProperty('categoryType') || 'N/A';
            const status = feat.getProperty('status') || 'N/A';
            const restriction = feat.getProperty('restriction') || 'N/A';
            const lowerLimit = feat.getProperty('lowerLimit');
            const lowerAltitudeUnit = feat.getProperty('lowerAltitudeUnit') || 'ft';
            const upperLimit = feat.getProperty('upperLimit');
            const upperAltitudeUnit = feat.getProperty('upperAltitudeUnit') || 'ft';
            const reason = feat.getProperty('reason') || 'N/A';
            const additionalInfo = feat.getProperty('additionalInfo') || 'N/A';

            const lowerLimitDisplay = (lowerLimit !== null && lowerLimit !== undefined) ? `${Math.round(Number(lowerLimit))} ${lowerAltitudeUnit}` : 'N/A';
            const upperLimitDisplay = (upperLimit !== null && upperLimit !== undefined) ? `${Math.round(Number(upperLimit))} ${upperAltitudeUnit}` : 'N/A';
            
            contentString += `<h4 style="font-weight: 600; margin-bottom: 0.4rem; color: hsl(var(--primary));">Zone: ${featureName}</h4>`;
            const infoMap = new globalThis.Map([
                ['Catégorie', categoryType], ['Statut', status], ['Limite Inf.', lowerLimitDisplay], ['Limite Sup.', upperLimitDisplay],
                ['Restriction', restriction], ['Raison', reason], ['Infos Add.', additionalInfo],
            ]);
            infoMap.forEach((value, key) => {
                if (value && String(value).trim() !== '' && String(value).trim().toUpperCase() !== 'N/A') {
                    contentString += `<p style="margin: 0.2rem 0;"><strong>${key}:</strong> ${value}</p>`;
                }
            });
          }
          contentString += `</div>`;
          localInfoWindow.setContent(contentString);
          localInfoWindow.setPosition(clickedLatLng);
          localInfoWindow.open(map);
        } else {
          localInfoWindow.close();
        }
      });

      currentDataLayer.setMap(map);
    } else if (currentDataLayer) {
      currentDataLayer.forEach(feature => currentDataLayer!.remove(feature));
      currentDataLayer.setMap(null);
      if (localInfoWindow) {
        localInfoWindow.close();
      }
    }
    
    return () => {
        if (currentDataLayer) {
            google.maps.event.clearInstanceListeners(currentDataLayer);
        }
    };
  }, [map, mapsLib, geometryLib, uavZonesData, showUAVZones, uavDataLayer]); // mapsLib et geometryLib ajoutés aux dépendances


  return (
    <>
      {selectedCoordsForMarker && (
        <>
          <AdvancedMarker
            position={{ lat: selectedCoordsForMarker.lat, lng: selectedCoordsForMarker.lng }}
            title={'Lieu sélectionné'}
          />
          <MapCircleOverlay
            center={{ lat: selectedCoordsForMarker.lat, lng: selectedCoordsForMarker.lng }}
            radius={150} 
            strokeColor={'hsl(var(--accent))'}
            strokeOpacity={0.9}
            strokeWeight={2.5}
            fillColor={'hsl(var(--accent))'}
            fillOpacity={0.25}
          />
        </>
      )}
    </>
  );
}

const arePropsEqual = (prevProps: MapComponentInternalProps, nextProps: MapComponentInternalProps) => {
  const centerSame = prevProps.center.lat === nextProps.center.lat && prevProps.center.lng === nextProps.center.lng;
  const zoomSame = prevProps.zoom === nextProps.zoom;
  const markerCoordsSame = (
    (prevProps.selectedCoordsForMarker === null && nextProps.selectedCoordsForMarker === null) ||
    (
      prevProps.selectedCoordsForMarker !== null && nextProps.selectedCoordsForMarker !== null &&
      prevProps.selectedCoordsForMarker.lat === nextProps.selectedCoordsForMarker.lat &&
      prevProps.selectedCoordsForMarker.lng === nextProps.selectedCoordsForMarker.lng
    )
  );
  const uavDataSame = prevProps.uavZonesData === nextProps.uavZonesData;
  const showUAVZonesSame = prevProps.showUAVZones === nextProps.showUAVZones;
  return centerSame && zoomSame && markerCoordsSame && uavDataSame && showUAVZonesSame;
};

const MemoizedMapComponentInternal = memo(MapComponentInternal, arePropsEqual);

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  selectedCoordsForMarker: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
  onCameraChange: (event: MapCameraChangedEvent) => void;
  uavZonesData?: GeoJSONFeatureCollection | null;
  showUAVZones: boolean;
  isLoadingUAVZones?: boolean;
}

export default function MapComponent({ center, zoom, selectedCoordsForMarker, onCoordsChange, onCameraChange, uavZonesData, showUAVZones, isLoadingUAVZones }: MapComponentProps) {
  const googleMapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_SILVER || "DEMO_MAP_ID";

  return (
    <div className="h-full w-full rounded-lg shadow-lg overflow-hidden relative" data-ai-hint="interactive google map">
        <Map
            center={center}
            zoom={zoom}
            style={{ width: '100%', height: '100%' }}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            mapTypeControl={true}
            streetViewControl={true}
            fullscreenControl={true}
            zoomControl={true}
            panControl={false} 
            clickableIcons={false}
            mapId={googleMapId}
            renderingType="RASTER" 
            onClick={(e: MapMouseEvent) => {
              if (e.detail?.latLng) {
                onCoordsChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
              }
            }}
            onCameraChanged={onCameraChange}
        >
            <MemoizedMapComponentInternal
                center={center}
                zoom={zoom}
                selectedCoordsForMarker={selectedCoordsForMarker}
                uavZonesData={uavZonesData}
                showUAVZones={showUAVZones}
            />
        </Map>
       {isLoadingUAVZones && showUAVZones && (
         <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm p-2 rounded-md shadow-lg text-sm z-10">
           Chargement des zones UAV...
         </div>
       )}
    </div>
  );
}
