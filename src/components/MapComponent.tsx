
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
      // No flyTo here, MapContainer center prop handles view changes based on selectedCoords
    },
  });

  return currentSelectedCoords === null ? null : (
    <Marker position={[currentSelectedCoords.lat, currentSelectedCoords.lng]} />
  );
}


export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<LeafletMapType | null>(null); // To store the Leaflet map instance

  // This key changes on HMR, forcing React to unmount/remount the keyed components.
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  // This ID also changes on HMR, giving Leaflet a new DOM ID for its container.
  const mapDomID = `leaflet-map-${mapInstanceKey}`;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to manually remove the map instance on unmount or when mapInstanceKey changes (HMR)
  useEffect(() => {
    // The cleanup function is called when the component unmounts
    // or BEFORE this effect re-runs if mapInstanceKey changes.
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
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
        id={mapDomID} // Assign the dynamic ID to the map container
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
            // Accent color from theme: #FFB866 (Yellow-Orange)
            pathOptions={{ color: '#FFB866', fillColor: '#FFB866', fillOpacity: 0.3 }}
          />
        )}
        <LocationMarkerComponent currentSelectedCoords={selectedCoords} onCoordsChange={onCoordsChange} />
      </MapContainer>
    </div>
  );
}
