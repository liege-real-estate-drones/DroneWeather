
"use client";

import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Icon setup (idempotent for HMR)
if (typeof window !== 'undefined') {
  const proto = L.Icon.Default.prototype as any;
  if (Object.prototype.hasOwnProperty.call(proto, '_getIconUrl')) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
  });
}

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

function LocationMarkerInternal({ onCoordsChange }: { onCoordsChange: (coords: Coordinates) => void; }) {
  useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null; // This component does not render anything itself
}

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [renderMap, setRenderMap] = useState(false);
  
  // This key changes every time MapComponent.tsx is hot-reloaded, forcing React to treat
  // the keyed components as new instances, triggering unmount/mount cycles.
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  const mapDomID = `map-container-${mapInstanceKey}`; // Generate a dynamic DOM ID for the map container

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (isClient) {
      // Ensure previous map is unmounted before rendering a new one by toggling renderMap
      setRenderMap(false); 
      timerId = setTimeout(() => {
        setRenderMap(true);
      }, 50); // Small delay to allow potential cleanup
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isClient, mapInstanceKey]); // Re-run if mapInstanceKey changes (HMR) or on initial client mount

  const position: LatLngExpression = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : [BELGIUM_CENTER.lat, BELGIUM_CENTER.lng];

  const zoom = selectedCoords ? DEFAULT_MAP_ZOOM + 2 : DEFAULT_MAP_ZOOM;

  if (!isClient) {
    return (
      <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden flex items-center justify-center" data-ai-hint="interactive map loading">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div
      key={mapInstanceKey} // Key on the PARENT div ensures its whole tree is replaced during HMR
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      {isClient && renderMap && ( 
        <MapContainer
          id={mapDomID} // Assign the dynamic ID to the map container
          key={mapInstanceKey} // Key on MapContainer itself ensures this specific component instance is replaced
          center={position}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selectedCoords && (
            <>
              <Circle
                center={[selectedCoords.lat, selectedCoords.lng]}
                radius={200} // meters
                pathOptions={{ color: '#FFB866', fillColor: '#FFB866', fillOpacity: 0.3 }} // Accent color
              />
              <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
            </>
          )}
          <LocationMarkerInternal onCoordsChange={onCoordsChange} />
        </MapContainer>
      )}
    </div>
  );
}
