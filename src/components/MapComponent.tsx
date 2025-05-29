
"use client";

import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMapType } from 'leaflet';
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
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

// function LocationMarkerComponent({ onCoordsChange, selectedCoords }: { onCoordsChange: (coords: Coordinates) => void; selectedCoords: Coordinates | null; }) {
//   useMapEvents({
//     click(e) {
//       onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
//     },
//   });
//   return selectedCoords ? <Marker position={[selectedCoords.lat, selectedCoords.lng]} /> : null;
// }

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [renderMap, setRenderMap] = useState(false);
  const mapRef = useRef<LeafletMapType | null>(null);
  const mapKeyAssociatedWithRef = useRef<string | null>(null); // Stores the mapInstanceKey of the map in mapRef
  
  // Unique key for the map instance, changes on HMR to force re-mount and proper cleanup
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  const mapDomID = `map-container-${mapInstanceKey}`; // Dynamic ID for the map DOM element

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to manage delayed rendering of the map for HMR stability
  useEffect(() => {
    if (isClient) {
      setRenderMap(false); // Ensure unmount of old instance if key changes or for delay
      const timer = setTimeout(() => {
        setRenderMap(true);
        console.log(`[MapEffect ${mapInstanceKey}] setTimeout triggered, setting renderMap to true.`);
      }, 50); // A small delay
      return () => {
        clearTimeout(timer);
        console.log(`[MapEffect ${mapInstanceKey}] clearTimeout for renderMap.`);
      };
    }
  }, [isClient, mapInstanceKey]); // Re-run if isClient or mapInstanceKey changes

  // Effect for cleaning up the map instance, tied to mapInstanceKey
  useEffect(() => {
    const effectKey = mapInstanceKey; // Capture the key for this effect cycle

    // This effect is now ONLY for cleanup.
    // It assumes whenCreated has set mapRef.current and mapKeyAssociatedWithRef.current.
    console.log(`[MapEffect ${effectKey}] Cleanup effect setup for key ${effectKey}. Current mapRef key: ${mapKeyAssociatedWithRef.current}`);

    return () => {
      console.log(`[MapEffect ${effectKey}] Cleanup function running for effect key ${effectKey}.`);
      console.log(`[MapEffect ${effectKey}] At cleanup: mapRef.current is ${mapRef.current ? 'set' : 'null'}, mapKeyAssociatedWithRef.current is ${mapKeyAssociatedWithRef.current}.`);

      // Check if the map currently in mapRef is the one associated with THIS effectKey
      if (mapRef.current && mapKeyAssociatedWithRef.current === effectKey) {
        const mapToClean = mapRef.current;
        const container = mapToClean.getContainer();
        console.log(`[MapEffect ${effectKey}] Attempting to remove map (key: ${effectKey}). Container _leaflet_id BEFORE remove: ${container?._leaflet_id}`);
        try {
          mapToClean.remove();
          console.log(`[MapEffect ${effectKey}] Map remove() called. Container _leaflet_id AFTER remove: ${container?._leaflet_id}`);
          
          if (container && Object.prototype.hasOwnProperty.call(container, '_leaflet_id')) {
            console.warn(`[MapEffect ${effectKey}] _leaflet_id still present on container after remove(). Attempting manual deletion.`);
            delete (container as any)._leaflet_id;
            const finalLeafletId = (container as any)._leaflet_id;
            console.log(`[MapEffect ${effectKey}] After manual delete, _leaflet_id is: ${finalLeafletId === undefined ? 'undefined (success)' : `still present (${finalLeafletId})`}`);
          }
        } catch (e) {
          console.error(`[MapEffect ${effectKey}] Error during map instance cleanup:`, e);
        }
        mapRef.current = null; // Cleaned this map, so nullify ref
        mapKeyAssociatedWithRef.current = null;
        console.log(`[MapEffect ${effectKey}] mapRef.current and mapKeyAssociatedWithRef.current nullified because it was the map for key ${effectKey}.`);
      } else {
        if (!mapRef.current) {
            console.log(`[MapEffect ${effectKey}] Cleanup: mapRef.current is already null. Nothing specific to clean for effect key ${effectKey}.`);
        } else {
            console.log(`[MapEffect ${effectKey}] Cleanup: mapRef.current (associated with key ${mapKeyAssociatedWithRef.current}) is for a different key. Not cleaning map for effect key ${effectKey}.`);
        }
      }
    };
  }, [mapInstanceKey]); // Re-run cleanup logic if mapInstanceKey changes


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
      {isClient && renderMap && ( 
        <MapContainer
          id={mapDomID} // Assign the dynamic ID to the map container
          key={mapInstanceKey} // AND Key on MapContainer itself
          center={position}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
            mapKeyAssociatedWithRef.current = mapInstanceKey; // Associate current mapInstanceKey with the map in ref
            const container = mapInstance.getContainer();
            console.log(`[MapEffect ${mapInstanceKey}] whenCreated - New map instance assigned to ref. mapKeyAssociatedWithRef is now ${mapInstanceKey}. Container _leaflet_id: ${container?._leaflet_id}`);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* {selectedCoords && (
            <Circle
              center={[selectedCoords.lat, selectedCoords.lng]}
              radius={200}
              pathOptions={{ color: '#FFB866', fillColor: '#FFB866', fillOpacity: 0.3 }} 
            />
          )}
          <LocationMarkerComponent onCoordsChange={onCoordsChange} selectedCoords={selectedCoords} /> */}
        </MapContainer>
      )}
    </div>
  );
}
