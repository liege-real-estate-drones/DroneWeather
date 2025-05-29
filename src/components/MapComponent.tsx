
"use client";

import { Map, AdvancedMarker, Circle, MapMouseEvent } from '@vis.gl/react-google-maps';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Gardé pour le cas où le parent ne gérerait pas le chargement

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const position = useMemo(() => (
    selectedCoords
    ? { lat: selectedCoords.lat, lng: selectedCoords.lng }
    : { lat: BELGIUM_CENTER.lat, lng: BELGIUM_CENTER.lng }
  ), [selectedCoords]);

  const zoom = useMemo(() => (
    selectedCoords ? DEFAULT_MAP_ZOOM + 4 : DEFAULT_MAP_ZOOM // Google Maps zoom levels (e.g., 8 for country, 12 for area)
  ), [selectedCoords]);

  // HomePage gère l'état isClient, donc ce composant suppose qu'il est monté côté client.
  // Si ce n'est pas le cas, un Skeleton simple peut être affiché si selectedCoords n'est pas défini, par exemple.
  // Toutefois, la logique de chargement principale est dans HomePage.

  return (
    <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive google map">
      <Map
        center={position}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false} // Empêche le clic sur les POI par défaut de Google Maps
        mapId="droneWeatherMapStyle" // Vous pouvez ajouter un Map ID pour des styles personnalisés
        onClick={(e: MapMouseEvent) => {
          if (e.detail?.latLng) {
            onCoordsChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
          }
        }}
      >
        {selectedCoords && (
          <>
            <AdvancedMarker
              position={{ lat: selectedCoords.lat, lng: selectedCoords.lng }}
              title={'Selected Location'}
            />
            <Circle
              center={{ lat: selectedCoords.lat, lng: selectedCoords.lng }}
              radius={200} // en mètres
              strokeColor={'#FFB866'} // Couleur d'accentuation (Jaune-Orange)
              strokeOpacity={0.8}
              strokeWeight={2}
              fillColor={'#FFB866'}   // Couleur d'accentuation
              fillOpacity={0.35}
            />
          </>
        )}
      </Map>
    </div>
  );
}
