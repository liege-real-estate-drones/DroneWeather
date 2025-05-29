"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import type { LatLngExpression, Map } from 'leaflet';
import L from 'leaflet'; // Import L for icon customization
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';

// Fix for default icon path issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

function LocationMarker({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const map = useMapEvents({
    click(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return selectedCoords === null ? null : (
     <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
  );
}


export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const mapRef = useRef<Map | null>(null);
  const position: LatLngExpression = selectedCoords 
    ? [selectedCoords.lat, selectedCoords.lng] 
    : [BELGIUM_CENTER.lat, BELGIUM_CENTER.lng];
  
  const zoom = selectedCoords ? DEFAULT_MAP_ZOOM + 2 : DEFAULT_MAP_ZOOM;

  // Effect to fly to new coordinates when selectedCoords changes externally (e.g. initial load or search)
  useEffect(() => {
    if (selectedCoords && mapRef.current) {
      mapRef.current.flyTo([selectedCoords.lat, selectedCoords.lng], mapRef.current.getZoom());
    }
  }, [selectedCoords]);


  return (
    <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive map">
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker selectedCoords={selectedCoords} onCoordsChange={onCoordsChange} />
         {selectedCoords && (
          <Circle 
            center={[selectedCoords.lat, selectedCoords.lng]} 
            radius={100} // Example radius in meters
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }} 
          />
        )}
      </MapContainer>
    </div>
  );
}
