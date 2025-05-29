"use client";

import { Map, AdvancedMarker, Circle } from '@vis.gl/react-google-maps';
import { BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MapComponentProps {
  selectedCoords: Coordinates | null;
  onCoordsChange: (coords: Coordinates) => void;
}

export default function MapComponent({ selectedCoords, onCoordsChange }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // useMemo pour le centre et le zoom afin d'éviter des recalculs inutiles
  // et pour rendre Map contrôlé si selectedCoords change
  const mapCenter = useMemo(() => (
    selectedCoords
    ? { lat: selectedCoords.lat, lng: selectedCoords.lng }
    : { lat: BELGIUM_CENTER.lat, lng: BELGIUM_CENTER.lng }
  ), [selectedCoords]);

  const mapZoom = useMemo(() => (
    selectedCoords ? DEFAULT_MAP_ZOOM + 4 : DEFAULT_MAP_ZOOM // Google Maps zoom levels are different
  ), [selectedCoords]);


  if (!isClient) {
    return (
      <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden flex items-center justify-center" data-ai-hint="interactive map loading">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  // Vous pouvez obtenir un Map ID depuis la Google Cloud Console pour des styles de carte personnalisés
  // Pour l'instant, nous utiliserons le style par défaut, donc mapId peut être undefined.
  // const mapId = "VOTRE_MAP_ID_PERSONNALISE"; // Optionnel

  return (
    <div className="h-[400px] md:h-full w-full rounded-lg shadow-lg overflow-hidden" data-ai-hint="interactive map">
      <Map
        // mapId={mapId} // Décommentez si vous utilisez un Map ID personnalisé
        style={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={mapZoom}
        gestureHandling={'greedy'} // Comportement de zoom/pan plus permissif
        disableDefaultUI={false}   // Afficher les contrôles UI par défaut de Google Maps (zoom, etc.)
        mapTypeControl={false}     // Cacher le contrôle de type de carte (satellite/plan)
        streetViewControl={false}  // Cacher le contrôle Street View
        fullscreenControl={false}  // Cacher le contrôle plein écran
        clickableIcons={false}     // Empêcher le clic sur les icônes POI par défaut de Google Maps
        onClick={(e: { detail: { latLng: { lat: any; lng: any; }; }; }) => {
          if (e.detail.latLng) {
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
              strokeColor={'#FFB866'} // Couleur d'accentuation (peut aussi utiliser var(--accent) si CSS est configuré pour)
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
