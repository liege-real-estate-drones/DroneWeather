
"use client";

import { MapContainer, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet'; 
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Fix for default icon path issue with Webpack, made idempotent for HMR
if (typeof window !== 'undefined') {
  const proto = L.Icon.Default.prototype as any;
  if (Object.prototype.hasOwnProperty.call(proto, '_getIconUrl')) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

// LocationMarker and Circle are temporarily removed for HMR debugging.
// interface LocationMarkerInnerProps {
//   selectedCoords: Coordinates | null;
//   onCoordsChange: (coords: Coordinates) => void;
// }

// function LocationMarker({ selectedCoords, onCoordsChange }: LocationMarkerInnerProps) {
//   const map = useMapEvents({
//     click(e) {
//       onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
//     },
//   });

//   return selectedCoords === null ? null : (
//      <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
//   );
// }

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const position: LatLngExpression = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : [BELGIUM_CENTER.lat, BELGIUM_CENTER.lng];

  const zoom = selectedCoords ? DEFAULT_MAP_ZOOM + 2 : DEFAULT_MAP_ZOOM;

  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  const mapDomID = `leaflet-map-${mapInstanceKey}`; 

  if (!isClient) {
    return (
      <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden flex items-center justify-center" data-ai-hint="interactive map loading">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div
      key={mapInstanceKey} // This key on the parent div forces re-render of the whole div and its children on HMR
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      <MapContainer
        id={mapDomID} // Assign the dynamic ID to the map container
        // key prop removed from here; parent div's key manages the instance lifecycle
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* 
          The LocationMarker and Circle components are still temporarily commented out 
          for diagnosing the HMR "Map container is already initialized" error.
          If HMR works without these, the issue lies within them or their interaction.
        */}
         {/* <LocationMarker selectedCoords={selectedCoords} onCoordsChange={onCoordsChange} /> */}
         {/* {selectedCoords && (
          <Circle
            center={[selectedCoords.lat, selectedCoords.lng]}
            radius={100} // Example radius in meters
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }}
          />
        )} */}
      </MapContainer>
    </div>
  );
}
