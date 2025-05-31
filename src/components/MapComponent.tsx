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
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const [uavDataLayer, setUavDataLayer] = useState<google.maps.Data | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [clickedFeaturesForInfoWindow, setClickedFeaturesForInfoWindow] = useState<google.maps.Data.Feature[]>([]);
  const [selectedFeatureIndexForInfoWindow, setSelectedFeatureIndexForInfoWindow] = useState<number>(0);
  const [infoWindowPosition, setInfoWindowPosition] = useState<google.maps.LatLng | null>(null);

  // Effet pour initialiser uavDataLayer et infoWindowRef
  useEffect(() => {
    if (!map || !mapsLib) return;

    if (!uavDataLayer) {
      const newDataLayer = new mapsLib.Data({ map });
      setUavDataLayer(newDataLayer);
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new mapsLib.InfoWindow();
    }
    // La dépendance uavDataLayer est là pour s'assurer que setUavDataLayer est appelé une seule fois.
  }, [map, mapsLib, uavDataLayer]);


  // Effet principal pour gérer les données UAV, le style et l'écouteur de clics
  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !uavDataLayer) {
        return;
    }

    // Toujours nettoyer les écouteurs précédents de la couche de données avant de reconfigurer
    google.maps.event.clearInstanceListeners(uavDataLayer);

    if (showUAVZones && uavZonesData) {
      uavDataLayer.forEach(feature => uavDataLayer.remove(feature)); // Nettoyer les anciennes données
      uavDataLayer.addGeoJson(uavZonesData);

      uavDataLayer.setStyle(feature => {
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
        return { fillColor: color, strokeColor: color, strokeWeight: 0.7, fillOpacity: fOpacity, clickable: true };
      });
      
      // Attacher l'écouteur de clics après avoir configuré les données et le style
      const clickListener = uavDataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
        if (!event.latLng || !uavDataLayer || !mapsLib || !geometryLib) return; 
        
        const clickedLatLng = event.latLng;
        const featuresAtLocation: google.maps.Data.Feature[] = [];

        uavDataLayer.forEach((feature: google.maps.Data.Feature) => {
          const geom = feature.getGeometry();
          if (!geom) return;

          let isContained = false;
          const geomType = geom.getType();

          const processDataPolygon = (dataPolygon: google.maps.Data.Polygon) => {
            const rings = dataPolygon.getArray();
            if (rings.length > 0) {
              const googleMapsPolygonPaths: google.maps.LatLng[][] = [];
              rings.forEach(linearRing => googleMapsPolygonPaths.push(linearRing.getArray()));
              const mapPolygon = new mapsLib.Polygon({ paths: googleMapsPolygonPaths });
              if (geometryLib.poly.containsLocation(clickedLatLng, mapPolygon)) {
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
              if (isContained) return; // Sortir tôt si déjà trouvé
            });
          }

          if (isContained) {
            featuresAtLocation.push(feature);
          }
        });

        if (featuresAtLocation.length === 0 && event.feature) {
          featuresAtLocation.push(event.feature); // Fallback
        }
        
        setClickedFeaturesForInfoWindow(featuresAtLocation);
        setSelectedFeatureIndexForInfoWindow(0);
        setInfoWindowPosition(clickedLatLng);
      });

      uavDataLayer.setMap(map); // Afficher la couche

      // Fonction de nettoyage pour cet effet
      return () => {
        google.maps.event.removeListener(clickListener); // Nettoyer l'écouteur spécifique
        // Ne pas supprimer les features ici, car cela pourrait être fait par le prochain rendu si showUAVZones change
      };

    } else { // Si showUAVZones est faux ou uavZonesData est null
      uavDataLayer.forEach(feature => uavDataLayer.remove(feature));
      uavDataLayer.setMap(null);
      infoWindowRef.current?.close();
      setClickedFeaturesForInfoWindow([]);
    }
  // Les dépendances incluent tout ce qui est nécessaire pour reconfigurer la couche et son écouteur
  }, [map, mapsLib, geometryLib, uavDataLayer, uavZonesData, showUAVZones]);


  // Effet pour afficher et mettre à jour le contenu de l'InfoWindow
  useEffect(() => {
    const currentInfoWindow = infoWindowRef.current; // Utiliser une variable locale pour la réf

    if (!map || !currentInfoWindow || !infoWindowPosition || clickedFeaturesForInfoWindow.length === 0) {
      currentInfoWindow?.close();
      return;
    }

    const generateInfoWindowContent = (features: google.maps.Data.Feature[], selectedIndex: number): string => {
      let contentString = `<div style="font-family: var(--font-geist-sans, sans-serif); font-size: 0.8rem; max-width: 300px; max-height: 350px; overflow-y: auto; padding-right: 10px; line-height: 1.4;">`;
      
      if (features.length > 1) {
        contentString += `<h4 style="font-weight: 600; margin-bottom: 0.4rem; color: hsl(var(--primary));">${features.length} zones à cet emplacement :</h4>`;
        contentString += `<select id="zone-selector-dropdown" style="margin-bottom: 0.7rem; width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: white; color: black;">`;
        features.forEach((feat, index) => {
          const featureName = feat.getProperty('name') || `Zone Inconnue ${index + 1}`;
          contentString += `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${featureName}</option>`;
        });
        contentString += `</select><hr style="margin: 0.5rem 0;" />`;
      }

      const detailsFeat = features[selectedIndex];
      if (!detailsFeat) {
          contentString += `<p>Impossible de charger les détails de la zone.</p></div>`;
          return contentString;
      }

      const featureName = detailsFeat.getProperty('name') || 'N/A';
      if (features.length === 1) {
        contentString += `<h4 style="font-weight: 600; margin-bottom: 0.4rem; color: hsl(var(--primary));">Zone: ${featureName}</h4>`;
      } else {
         contentString += `<p style="font-size:0.7rem; margin-bottom:0.3rem; font-style:italic;">Détails pour : ${featureName}</p>`;
      }
      
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
      contentString += `</div>`;
      return contentString;
    };

    const content = generateInfoWindowContent(clickedFeaturesForInfoWindow, selectedFeatureIndexForInfoWindow);
    currentInfoWindow.setContent(content);
    currentInfoWindow.setPosition(infoWindowPosition);
    currentInfoWindow.open({map: map, shouldFocus: false });

    const dropdown = document.getElementById('zone-selector-dropdown') as HTMLSelectElement | null;
    let handleChange: (() => void) | null = null;

    if (dropdown) {
      handleChange = () => {
        setSelectedFeatureIndexForInfoWindow(parseInt(dropdown.value, 10));
      };
      // Attacher l'écouteur
      dropdown.addEventListener('change', handleChange);
    }

    // Nettoyage pour l'écouteur du dropdown
    return () => {
      if (dropdown && handleChange) {
        dropdown.removeEventListener('change', handleChange);
      }
    };
  // infoWindowRef.current est stable, donc infoWindowRef peut être utilisé dans les dépendances.
  }, [map, infoWindowRef, clickedFeaturesForInfoWindow, selectedFeatureIndexForInfoWindow, infoWindowPosition]);


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
