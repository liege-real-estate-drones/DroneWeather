
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

function LocationMarkerInternal({
  onCoordsChange,
  selectedCoords
}: {
  onCoordsChange: (coords: Coordinates) => void;
  selectedCoords: Coordinates | null;
}) {
  useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return selectedCoords ? <Marker position={[selectedCoords.lat, selectedCoords.lng]} /> : null;
}


export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<LeafletMapType | null>(null);
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect for cleaning up the map instance, tied to mapInstanceKey
  useEffect(() => {
    const mapInstanceToClean = mapRef.current; 
    const effectKey = mapInstanceKey; 

    if (mapInstanceToClean) {
      const container = mapInstanceToClean.getContainer();
      console.log(`[MapEffect ${effectKey}] Setup. Map instance exists. Container _leaflet_id: ${container?._leaflet_id}`);
    } else {
      console.log(`[MapEffect ${effectKey}] Setup. No map instance at ref yet for key ${effectKey}.`);
    }

    return () => {
      console.log(`[MapEffect ${effectKey}] Cleanup starting for map associated with key ${effectKey}.`);
      if (mapInstanceToClean) {
        const container = mapInstanceToClean.getContainer();
        try {
          const leafletIdBeforeRemove = container?._leaflet_id;
          console.log(`[MapEffect ${effectKey}] Attempting to remove map. Container _leaflet_id BEFORE remove: ${leafletIdBeforeRemove}`);
          
          mapInstanceToClean.remove(); 
          
          const leafletIdAfterRemove = container?._leaflet_id;
          console.log(`[MapEffect ${effectKey}] Map remove() called. Container _leaflet_id AFTER remove: ${leafletIdAfterRemove}`);

          if (container && Object.prototype.hasOwnProperty.call(container, '_leaflet_id')) {
            console.warn(`[MapEffect ${effectKey}] _leaflet_id still present on container after remove(). Attempting manual deletion.`);
            delete (container as any)._leaflet_id; 
            const leafletIdAfterManualDelete = (container as any)._leaflet_id;
            console.log(`[MapEffect ${effectKey}] After manual delete, _leaflet_id is: ${leafletIdAfterManualDelete}`);
            if (leafletIdAfterManualDelete === undefined) {
                console.log(`[MapEffect ${effectKey}] Manual deletion of _leaflet_id appears successful.`);
            } else {
                console.error(`[MapEffect ${effectKey}] Manual deletion of _leaflet_id FAILED. _leaflet_id is still: ${leafletIdAfterManualDelete}`);
            }
          }
        } catch (e) {
          console.error(`[MapEffect ${effectKey}] Error during map instance cleanup:`, e);
        }
      } else {
        console.log(`[MapEffect ${effectKey}] Cleanup: No map instance was captured by this effect to clean.`);
      }

      if (mapRef.current === mapInstanceToClean) {
        console.log(`[MapEffect ${effectKey}] Cleanup: Nullifying mapRef.current as it pointed to the cleaned instance.`);
        mapRef.current = null;
      } else {
         console.log(`[MapEffect ${effectKey}] Cleanup: mapRef.current already changed or was null. Current mapRef: ${mapRef.current}, cleaned instance: ${mapInstanceToClean}.`);
      }
    };
  }, [mapInstanceKey]);


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
      key={mapInstanceKey} // Key on the PARENT div
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      {isClient && ( // Keep isClient check for initial render
        <MapContainer
          key={mapInstanceKey} // AND Key on MapContainer itself
          center={position}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
            const container = mapInstance.getContainer();
            console.log(`[MapEffect ${mapInstanceKey}] whenCreated - New map instance assigned to ref for key ${mapInstanceKey}. Container _leaflet_id: ${container?._leaflet_id}`);
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
          <LocationMarkerInternal onCoordsChange={onCoordsChange} selectedCoords={selectedCoords} />
        </MapContainer>
      )}
    </div>
  );
}
