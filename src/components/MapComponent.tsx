
"use client";

import { memo, useEffect, useState } from 'react';
import { Map, AdvancedMarker, MapMouseEvent, useMap, useMapsLibrary, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import type { Coordinates } from '@/types';

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

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  selectedCoordsForMarker: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
  onCameraChange: (event: MapCameraChangedEvent) => void;
}

function MapComponentInternal({ center, zoom, selectedCoordsForMarker, onCoordsChange, onCameraChange }: MapComponentProps) {
  console.log('[MapComponent.tsx] Rendering MapComponentInternal. Center:', center, 'Zoom:', zoom, 'SelectedCoordsForMarker:', selectedCoordsForMarker);

  return (
    <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive google map">
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
        panControl={false} // Explicitly disable pan arrows
        clickableIcons={false}
        mapId="droneWeatherMapStyle"
        renderingType="RASTER"
        onClick={(e: MapMouseEvent) => {
          if (e.detail?.latLng) {
            onCoordsChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
          }
        }}
        onCameraChanged={onCameraChange}
      >
        {selectedCoordsForMarker && (
          <>
            <AdvancedMarker
              position={{ lat: selectedCoordsForMarker.lat, lng: selectedCoordsForMarker.lng }}
              title={'Selected Location'}
            />
            <MapCircleOverlay
              center={{ lat: selectedCoordsForMarker.lat, lng: selectedCoordsForMarker.lng }}
              radius={200} // Example radius, adjust as needed
              strokeColor={'hsl(var(--accent))'}
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor={'hsl(var(--accent))'}
              fillOpacity={0.35}
            />
          </>
        )}
      </Map>
    </div>
  );
}

const arePropsEqual = (prevProps: MapComponentProps, nextProps: MapComponentProps) => {
  const centerSame = prevProps.center.lat === nextProps.center.lat && prevProps.center.lng === nextProps.center.lng;
  const zoomSame = prevProps.zoom === nextProps.zoom;

  const coordsMarkerSameOrBothNull = (
    (prevProps.selectedCoordsForMarker === null && nextProps.selectedCoordsForMarker === null) ||
    (
      prevProps.selectedCoordsForMarker !== null && nextProps.selectedCoordsForMarker !== null &&
      prevProps.selectedCoordsForMarker.lat === nextProps.selectedCoordsForMarker.lat &&
      prevProps.selectedCoordsForMarker.lng === nextProps.selectedCoordsForMarker.lng
    )
  );

  const callbacksSame = prevProps.onCoordsChange === nextProps.onCoordsChange && prevProps.onCameraChange === nextProps.onCameraChange;

  if (centerSame && zoomSame && coordsMarkerSameOrBothNull && callbacksSame) {
    console.log('[MapComponent.tsx] React.memo: Props are equal, skipping re-render.');
    return true; // Props are equal, skip re-render
  }
  
  console.log(
    '[MapComponent.tsx] React.memo: Props are different, re-rendering. Center changed:', !centerSame,
    'Zoom changed:', !zoomSame,
    'Marker Coords changed:', !coordsMarkerSameOrBothNull,
    'onCoordsChange changed:', prevProps.onCoordsChange !== nextProps.onCoordsChange,
    'onCameraChange changed:', prevProps.onCameraChange !== nextProps.onCameraChange
  );
  return false; // Props are different, re-render
};

export default memo(MapComponentInternal, arePropsEqual);
