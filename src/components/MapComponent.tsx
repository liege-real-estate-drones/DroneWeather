
"use client";

import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMapType } from 'leaflet';
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

function LocationMarker({
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
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const mapInstanceToClean = mapRef.current; 
    const effectKey = mapInstanceKey; // Capture the key for this effect instance

    if (mapInstanceToClean) {
      const container = mapInstanceToClean.getContainer();
      console.log(`[MapEffect ${effectKey}] Setup. Map instance exists. Container _leaflet_id: ${container?._leaflet_id}`);
    } else {
      console.log(`[MapEffect ${effectKey}] Setup. No map instance at ref yet.`);
    }

    return () => {
      console.log(`[MapEffect ${effectKey}] Cleanup starting for key ${effectKey}.`);
      if (mapInstanceToClean) {
        try {
          const container = mapInstanceToClean.getContainer();
          const leafletIdBeforeRemove = container?._leaflet_id;
          console.log(`[MapEffect ${effectKey}] Attempting to remove map. Container _leaflet_id BEFORE remove: ${leafletIdBeforeRemove}`);
          
          mapInstanceToClean.remove(); 
          
          const leafletIdAfterRemove = container?._leaflet_id;
          console.log(`[MapEffect ${effectKey}] Map remove() called. Container _leaflet_id AFTER remove: ${leafletIdAfterRemove}`);

          if (container && container._leaflet_id) {
            console.warn(`[MapEffect ${effectKey}] _leaflet_id still present on container after remove(). This might be the issue.`);
          }

        } catch (e) {
          console.error(`[MapEffect ${effectKey}] Error removing map instance:`, e);
        }
      } else {
        console.log(`[MapEffect ${effectKey}] Cleanup: No map instance was captured by this effect to clean.`);
      }

      // Nullify the ref only if it still points to the instance we just cleaned up.
      // This helps prevent issues if a new map instance was somehow assigned to the ref
      // before this cleanup ran (though with key changes, this should be less likely).
      if (mapRef.current === mapInstanceToClean) {
        console.log(`[MapEffect ${effectKey}] Cleanup: Nullifying mapRef.current.`);
        mapRef.current = null;
      } else {
         console.log(`[MapEffect ${effectKey}] Cleanup: mapRef.current (value: ${mapRef.current}) was already different or null than mapInstanceToClean (value: ${mapInstanceToClean}).`);
      }
    };
  }, [mapInstanceKey]); // This effect and its cleanup are tied to mapInstanceKey


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
      key={mapInstanceKey} 
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      <MapContainer
        key={mapInstanceKey} 
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
          const container = mapInstance.getContainer();
          console.log(`[MapEffect ${mapInstanceKey}] whenCreated - Map instance assigned to ref. Container _leaflet_id: ${container?._leaflet_id}`);
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
            pathOptions={{ color: '#FFB866', fillColor: '#FFB866', fillOpacity: 0.3 }}
          />
        )}
        <LocationMarker currentSelectedCoords={selectedCoords} onCoordsChange={onCoordsChange} />
      </MapContainer>
    </div>
  );
}

