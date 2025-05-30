
"use client";

import { memo, useMemo, useEffect, useState } from 'react'; // Ensure all hooks are imported
import { Map, AdvancedMarker, MapMouseEvent, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
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
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

function MapComponentInternal({ selectedCoords, onCoordsChange }: MapComponentProps) {
  console.log('[MapComponent.tsx] Rendering MapComponentInternal. SelectedCoords:', selectedCoords);

  const position = useMemo(() => (
    selectedCoords
    ? { lat: selectedCoords.lat, lng: selectedCoords.lng }
    : { lat: BELGIUM_CENTER.lat, lng: BELGIUM_CENTER.lng }
  ), [selectedCoords]);

  const zoom = useMemo(() => (
    selectedCoords ? DEFAULT_MAP_ZOOM + 4 : DEFAULT_MAP_ZOOM
  ), [selectedCoords]);

  return (
    <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive google map">
      <Map
        center={position}
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
        mapId="droneWeatherMapStyle"
        renderingType="RASTER"
        onClick={(e: MapMouseEvent) => {
          if (e.detail?.latLng) {
            onCoordsChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
          }
        }}
      >
        {selectedCoords && (
          <>
            <AdvancedMarker
              position={{ lat: selectedCoords.lat, lng: selectedCoords.lng }}
              title={'Selected Location'}
            />
            <MapCircleOverlay
              center={{ lat: selectedCoords.lat, lng: selectedCoords.lng }}
              radius={200}
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
  const coordsSameOrBothNull = (
    (prevProps.selectedCoords === null && nextProps.selectedCoords === null) ||
    (
      prevProps.selectedCoords !== null && nextProps.selectedCoords !== null &&
      prevProps.selectedCoords.lat === nextProps.selectedCoords.lat &&
      prevProps.selectedCoords.lng === nextProps.selectedCoords.lng
    )
  );
  const callbackSame = prevProps.onCoordsChange === nextProps.onCoordsChange;

  if (coordsSameOrBothNull && callbackSame) {
    console.log('[MapComponent.tsx] React.memo: Props are equal, skipping re-render.');
    return true; // Props are equal, skip re-render
  }
  
  console.log(
    '[MapComponent.tsx] React.memo: Props are different, re-rendering. Coords changed:', 
    !coordsSameOrBothNull, 
    'PrevCoords:', prevProps.selectedCoords, 
    'NextCoords:', nextProps.selectedCoords,
    'Callback changed:', !callbackSame
  );
  return false; // Props are different, re-render
};

export default memo(MapComponentInternal, arePropsEqual);
