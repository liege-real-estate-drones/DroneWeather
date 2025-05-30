
"use client";

import { memo, useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, MapMouseEvent, useMap, useMapsLibrary, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import type { Coordinates } from '@/types';
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
    // Cleanup function to remove the circle when the component unmounts or dependencies change
    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
  }, [map, mapsLib, circle, center, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null;
}


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

function MapComponentInternal({ 
    center, 
    zoom, 
    selectedCoordsForMarker, 
    onCoordsChange, 
    onCameraChange, 
    uavZonesData,
    showUAVZones,
    // isLoadingUAVZones // passed but not directly used in MapComponentInternal for now
}: MapComponentProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [uavDataLayer, setUavDataLayer] = useState<google.maps.Data | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Effect for managing UAV Zones Data Layer
  useEffect(() => {
    if (!map || !mapsLib) return;

    let currentDataLayer = uavDataLayer;
    if (!currentDataLayer) {
      currentDataLayer = new mapsLib.Data({ map }); // Associate with map immediately
      setUavDataLayer(currentDataLayer);
    }

    if (!infoWindowRef.current) {
      infoWindowRef.current = new mapsLib.InfoWindow();
    }
    const localInfoWindow = infoWindowRef.current;

    if (showUAVZones && uavZonesData && currentDataLayer) {
      // Clear existing features before adding new ones
      currentDataLayer.forEach(feature => currentDataLayer!.remove(feature));
      currentDataLayer.addGeoJson(uavZonesData);

      currentDataLayer.setStyle(feature => {
        let color = 'hsl(var(--muted))'; // Default color
        let fOpacity = 0.20;
        const category = feature.getProperty('categoryType')?.toString().toUpperCase();
        const status = feature.getProperty('status')?.toString().toUpperCase();
        
        // More specific status checks first
        if (status === 'PROHIBITED' || category === 'P') {
          color = 'hsl(var(--destructive))'; // Red
          fOpacity = 0.35;
        } else if (status === 'RESTRICTED' || category === 'R') {
          color = 'hsl(var(--accent))'; // Orange/Yellow
          fOpacity = 0.30;
        } else if (category === 'D') { // Danger Area
          color = 'hsl(var(--primary))'; // Primary theme color (Sky Blue)
          fOpacity = 0.25;
        } else if (category?.includes('TRA') || category?.includes('TSA')) { // Temporary Reserved/Segregated
          color = 'hsl(260, 70%, 60%)'; // Purple
          fOpacity = 0.25;
        } else if (category === 'CTR') {
            color = 'hsl(120, 70%, 40%)'; // Green
            fOpacity = 0.20;
        } else if (category === 'RMZ' || category === 'TMZ') { // Radio/Transponder Mandatory Zone
            color = 'hsl(40, 70%, 50%)'; // Brownish-orange
            fOpacity = 0.20;
        }
        // Add more specific category checks as needed based on actual data

        return {
          fillColor: color,
          strokeColor: color,
          strokeWeight: 0.7,
          fillOpacity: fOpacity,
          clickable: true,
        };
      });

      // Remove previous listeners to avoid duplicates
      google.maps.event.clearInstanceListeners(currentDataLayer);

      currentDataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
        if (!map || !localInfoWindow || !event.feature) return;
        
        const featureName = event.feature.getProperty('name') || 'N/A';
        const categoryType = event.feature.getProperty('categoryType') || 'N/A';
        const status = event.feature.getProperty('status') || 'N/A';
        const restriction = event.feature.getProperty('restriction') || 'N/A';
        const lowerLimit = event.feature.getProperty('lowerLimit');
        const lowerAltitudeUnit = event.feature.getProperty('lowerAltitudeUnit') || '';
        const upperLimit = event.feature.getProperty('upperLimit');
        const upperAltitudeUnit = event.feature.getProperty('upperAltitudeUnit') || '';
        const reason = event.feature.getProperty('reason') || 'N/A';
        const additionalInfo = event.feature.getProperty('additionalInfo') || 'N/A';
        const type = event.feature.getProperty('type') || 'N/A';


        let content = `<div style="font-family: var(--font-geist-sans, sans-serif); font-size: 0.8rem; max-width: 280px; max-height: 250px; overflow-y: auto; padding-right: 10px; line-height: 1.4;">`;
        content += `<h4 style="font-weight: 600; margin-bottom: 0.4rem; color: hsl(var(--primary));">Zone: ${featureName}</h4>`;
        
        const propertiesMap = new Map([
            ['Type', type],
            ['Catégorie', categoryType],
            ['Statut', status],
            ['Restriction', restriction],
            ['Limite Inf.', lowerLimit !== null && lowerLimit !== undefined ? `${lowerLimit} ${lowerAltitudeUnit}` : 'N/A'],
            ['Limite Sup.', upperLimit !== null && upperLimit !== undefined ? `${upperLimit} ${upperAltitudeUnit}` : 'N/A'],
            ['Raison', reason],
            ['Infos Add.', additionalInfo],
        ]);

        propertiesMap.forEach((value, key) => {
            if (value && String(value).trim() !== '' && String(value).trim() !== 'N/A') {
                 content += `<p style="margin: 0.2rem 0;"><strong>${key}:</strong> ${value}</p>`;
            }
        });
        
        content += `</div>`;

        localInfoWindow.setContent(content);
        localInfoWindow.setPosition(event.latLng);
        localInfoWindow.open(map);
      });

      currentDataLayer.setMap(map); // Ensure layer is visible
    } else if (currentDataLayer) {
      currentDataLayer.forEach(feature => currentDataLayer!.remove(feature));
      currentDataLayer.setMap(null); // Hide layer
      if (localInfoWindow) {
        localInfoWindow.close();
      }
    }
    
    // Cleanup for data layer listeners
    return () => {
        if (currentDataLayer) {
            google.maps.event.clearInstanceListeners(currentDataLayer);
        }
        if (localInfoWindow) {
            localInfoWindow.close();
        }
    };

  }, [map, mapsLib, uavZonesData, showUAVZones, uavDataLayer]); // uavDataLayer added as dependency


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


const arePropsEqual = (prevProps: MapComponentProps, nextProps: MapComponentProps) => {
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

  const callbacksSame = prevProps.onCoordsChange === nextProps.onCoordsChange && prevProps.onCameraChange === nextProps.onCameraChange;
  const uavDataSame = prevProps.uavZonesData === nextProps.uavZonesData; // Could be shallow or deep, simple ref check for now
  const showUAVZonesSame = prevProps.showUAVZones === nextProps.showUAVZones;
  const isLoadingUAVZonesSame = prevProps.isLoadingUAVZones === nextProps.isLoadingUAVZones;

  const allSame = centerSame && zoomSame && markerCoordsSame && callbacksSame && uavDataSame && showUAVZonesSame && isLoadingUAVZonesSame;

  if (!allSame) {
    console.log('[MapComponent.tsx] React.memo: Props ARE different, re-rendering MapComponentInternal. Changes:', {
        centerChanged: !centerSame,
        zoomChanged: !zoomSame,
        markerCoordsChanged: !markerCoordsSame,
        onCoordsChangeChanged: prevProps.onCoordsChange !== nextProps.onCoordsChange,
        onCameraChangeChanged: prevProps.onCameraChange !== nextProps.onCameraChange,
        uavDataChanged: !uavDataSame,
        showUAVZonesChanged: !showUAVZonesSame,
        isLoadingUAVZonesChanged: !isLoadingUAVZonesSame,
      });
  }
  return allSame;
};

const MemoizedMapComponentInternal = memo(MapComponentInternal, arePropsEqual);


export default function MapComponent({ center, zoom, selectedCoordsForMarker, onCoordsChange, onCameraChange, uavZonesData, showUAVZones, isLoadingUAVZones }: MapComponentProps) {
  // console.log('[MapComponent.tsx] Rendering MapComponent Wrapper. Center:', center, 'Zoom:', zoom, 'SelectedCoordsForMarker:', selectedCoordsForMarker, 'ShowUAV:', showUAVZones);
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_SILVER || "DEMO_MAP_ID";

  return (
    <div className="h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive google map">
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
            mapId={mapId}
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
                onCoordsChange={onCoordsChange}
                onCameraChange={onCameraChange}
                uavZonesData={uavZonesData}
                showUAVZones={showUAVZones}
                isLoadingUAVZones={isLoadingUAVZones}
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

