
"use client";

import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMapType } from 'leaflet'; // Aliased import
import L from 'leaflet';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Fix for default icon path issue with Webpack, made idempotent for HMR
if (typeof window !== 'undefined') {
  const proto = L.Icon.Default.prototype as any;
  // Only delete if it exists, to avoid errors on subsequent HMR runs if already deleted
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

// Define LocationMarkerComponent outside MapComponent for clarity
function LocationMarkerComponent({
  currentSelectedCoords,
  onCoordsChange,
}: {
  currentSelectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return currentSelectedCoords === null ? null : (
    <Marker position={[currentSelectedCoords.lat, currentSelectedCoords.lng]} />
  );
}


export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<LeafletMapType | null>(null); 

  // This key changes on HMR, forcing React to unmount/remount the keyed components.
  // It also ensures a new map DOM ID is generated.
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to manually remove the map instance on unmount or when mapInstanceKey changes (HMR)
  useEffect(() => {
    const currentMapInstance = mapRef.current;
    // The cleanup function is called when the component unmounts
    // or BEFORE this effect re-runs if mapInstanceKey changes.
    return () => {
      if (currentMapInstance) {
        try {
          // console.log('Attempting to remove map instance for key:', mapInstanceKey, currentMapInstance);
          currentMapInstance.remove(); // Call Leaflet's cleanup
        } catch (e) {
          console.error('Error removing map instance:', e);
        }
      }
      // If the ref still points to the instance we captured, nullify it.
      // This might be redundant if the component instance is fully replaced by key change.
      if (mapRef.current === currentMapInstance) {
        mapRef.current = null;
      }
    };
  }, [mapInstanceKey]); // Depend on mapInstanceKey to trigger cleanup on HMR

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
      key={mapInstanceKey} // This key on the parent div forces re-render of the whole div and its children on HMR
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      <MapContainer
        // No explicit 'id' prop here, let react-leaflet manage its container's identity
        key={mapInstanceKey} // Add key here as well to ensure MapContainer instance is replaced
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => { // Callback to get the map instance
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {selectedCoords && (
          <Circle
            center={[selectedCoords.lat, selectedCoords.lng]}
            radius={200}
            pathOptions={{ color: '#FFB866', fillColor: '#FFB866', fillOpacity: 0.3 }} // Using direct hex color
          />
        )}
        <LocationMarkerComponent currentSelectedCoords={selectedCoords} onCoordsChange={onCoordsChange} />
      </MapContainer>
    </div>
  );
}
