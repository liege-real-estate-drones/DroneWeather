"use client";

import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMapInstanceType } from 'leaflet';
import L from 'leaflet';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Icon setup for Leaflet (idempotent for HMR)
// This check ensures that the code runs only in the client-side environment.
if (typeof window !== 'undefined') {
  // Accessing L.Icon.Default.prototype can cause issues if Leaflet is not fully loaded
  // or if this code runs in a non-browser environment during some build steps.
  // It's generally safer to ensure Leaflet is loaded before modifying its prototypes.
  // However, for the specific issue of icon paths, this is a common workaround.
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

// Component to handle map click events and update coordinates
function LocationMarker({ onCoordsChange }: { onCoordsChange: (coords: Coordinates) => void; }) {
  useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null; // This component does not render anything itself
}

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);
  // Ref to store the Leaflet map instance
  const mapRef = useRef<LeafletMapInstanceType | null>(null);
  
  // Unique key to force re-creation of the map on HMR or other scenarios if needed.
  // Using a symbol converted to string ensures it's unique per component instance.
  const mapInstanceKey = useRef(Symbol('mapInstanceKey').toString()).current;
  // Dynamic DOM ID for the map container to prevent conflicts if multiple maps were ever rendered.
  const mapDomID = `map-container-${mapInstanceKey}`; 

  // Effect to set isClient to true after component mounts, ensuring client-side only rendering for Leaflet.
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Determine the map's center position. Default to Belgium center if no coordinates are selected.
  const position: LatLngExpression = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : [BELGIUM_CENTER.lat, BELGIUM_CENTER.lng];

  // Adjust zoom level based on whether coordinates are selected.
  const zoom = selectedCoords ? DEFAULT_MAP_ZOOM + 2 : DEFAULT_MAP_ZOOM;

  // Show skeleton loader if not on client-side yet (prevents SSR issues with Leaflet)
  if (!isClient) {
    return (
      <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden flex items-center justify-center" data-ai-hint="interactive map loading">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  // Render the map once isClient is true
  return (
    <div
      key={mapInstanceKey} 
      className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden"
      data-ai-hint="interactive map"
    >
      {/* MapContainer is the main component for the Leaflet map */}
      <MapContainer
        ref={mapRef} // Assign the map instance to mapRef using the ref prop
        id={mapDomID} 
        key={mapInstanceKey} 
        center={position}
        zoom={zoom}
        // The 'whenReady' prop expects a function with no arguments.
        // The map instance is available via mapRef.current after this callback.
        whenReady={() => { 
          // You can perform actions here that depend on the map being ready.
          // For example, logging that the map is ready and the ref is populated.
          if (mapRef.current) {
            console.log('Map is ready. Instance:', mapRef.current);
          }
        }}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* TileLayer for the OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Display Circle and Marker if coordinates are selected */}
        {selectedCoords && (
          <>
            <Circle
              center={[selectedCoords.lat, selectedCoords.lng]}
              radius={200} 
              pathOptions={{ color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.3 }}
            />
            <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
          </>
        )}
        {/* Component to handle map click events */}
        <LocationMarker onCoordsChange={onCoordsChange} />
      </MapContainer>
    </div>
  );
}
