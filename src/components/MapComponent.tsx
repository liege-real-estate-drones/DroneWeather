
"use client";

import { MapContainer, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
// import { Circle, Marker, useMapEvents } from 'react-leaflet'; // Temporarily commented out

// Fix for default icon path issue with Webpack, made idempotent for HMR
if (typeof window !== 'undefined') {
  const proto = L.Icon.Default.prototype as any;
  if (Object.prototype.hasOwnProperty.call(proto, '_getIconUrl')) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', // Corrected typo here
  });
}

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

// Temporarily commented out LocationMarker
/*
function LocationMarker({
  selectedCoords,
  onCoordsChange,
}: {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      // Removed map.flyTo from here as MapContainer center prop should handle it
    },
  });

  // useEffect to handle map flying to new selectedCoords was removed
  // Marker rendering based on selectedCoords
  return selectedCoords === null ? null : (
    <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
  );
}
*/

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const position: LatLngExpression = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : [BELGIUM_CENTER.lat, BELGIUM_CENTER.lng];

  const zoom = selectedCoords ? DEFAULT_MAP_ZOOM + 2 : DEFAULT_MAP_ZOOM;

  // This key changes on HMR, forcing React to unmount/remount the keyed components.
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  // This ID also changes on HMR, giving Leaflet a new DOM ID for its container.
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
        key={mapInstanceKey} // Add key here as well to ensure MapContainer instance is replaced
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
          LocationMarker and Circle are still temporarily commented out
          {selectedCoords && <Circle center={[selectedCoords.lat, selectedCoords.lng]} radius={200} />}
          <LocationMarker selectedCoords={selectedCoords} onCoordsChange={onCoordsChange} />
        */}
      </MapContainer>
    </div>
  );
}
