
"use client";

import { Map, AdvancedMarker, MapMouseEvent, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useMemo, useEffect, useState } from 'react'; 

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
      // Update existing circle
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

    // Cleanup function to remove the circle when the component unmounts
    // or when dependencies that would nullify it change (e.g., map becomes null)
    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
  }, [map, mapsLib, circle, center, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  // This component doesn't render any JSX itself, it manipulates the map imperatively.
  return null;
}


interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
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
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        mapId="droneWeatherMapStyle"
        renderingType="RASTER" // Explicitly set renderingType
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
              radius={200} // in meters
              strokeColor={'var(--accent)'} 
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor={'var(--accent)'}   
              fillOpacity={0.35}
            />
          </>
        )}
      </Map>
    </div>
  );
}
