
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import WeatherInfoComponent from '@/components/WeatherInfoComponent';
import DroneProfileSelector from '@/components/DroneProfileSelector';
import CustomDroneParamsForm from '@/components/CustomDroneParamsForm';
import { DEFAULT_DRONE_PROFILES, DJI_MINI_4_PRO_PROFILE, DRONE_MODELS, BELGIUM_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import type { Coordinates, DroneProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PlaneTakeoff, MapPinOff } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { APIProvider, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import MapComponent from '@/components/MapComponent'; // MODIFIED: Direct import

export default function HomePage() {
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: BELGIUM_CENTER.lat, lng: BELGIUM_CENTER.lng });
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  const [selectedDroneModel, setSelectedDroneModel] = useState<string>(DRONE_MODELS.MINI_4_PRO);
  const [customDroneParams, setCustomDroneParams] = useState<Omit<DroneProfile, 'name'>>(DJI_MINI_4_PRO_PROFILE);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCoordsChange = useCallback((coords: Coordinates) => {
    setSelectedCoords(coords);
    setMapCenter({ lat: coords.lat, lng: coords.lng });
    setMapZoom(DEFAULT_MAP_ZOOM + 4); // Zoom in when a location is selected
  }, []);

  const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
    const newCenter = ev.detail.center;
    const newZoom = ev.detail.zoom;
    setMapCenter({ lat: newCenter.lat, lng: newCenter.lng });
    setMapZoom(newZoom);
  }, []);

  const handleDroneModelChange = (modelName: string) => {
    setSelectedDroneModel(modelName);
    if (modelName !== DRONE_MODELS.CUSTOM) {
      const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === modelName);
      if (profile) {
        setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp });
      }
    }
  };

  const handleCustomParamsSubmit = (data: Omit<DroneProfile, 'name'>) => {
    setCustomDroneParams(data);
    toast({ title: "Paramètres personnalisés sauvegardés", description: "Vos paramètres de drone personnalisés sont maintenant actifs." });
  };

  const activeDroneProfile: DroneProfile = useMemo(() => {
    if (selectedDroneModel === DRONE_MODELS.CUSTOM) {
      return { name: DRONE_MODELS.CUSTOM, ...customDroneParams };
    }
    const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === selectedDroneModel);
    return profile || { name: selectedDroneModel, ...customDroneParams };
  }, [selectedDroneModel, customDroneParams]);


  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <PlaneTakeoff size={64} className="text-primary animate-pulse mb-4" />
        <p className="text-xl text-muted-foreground">Chargement de DroneWeather...</p>
      </div>
    );
  }

  if (!googleMapsApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <MapPinOff size={64} className="text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Configuration requise</h2>
        <p className="text-lg text-muted-foreground">
          La clé API Google Maps est manquante.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Veuillez définir la variable d'environnement <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_Maps_API_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={googleMapsApiKey}>
      <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background to-muted/30">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-primary flex items-center gap-2">
            <PlaneTakeoff size={40} />
            DroneWeather
          </h1>
          <p className="text-lg text-muted-foreground">
            Informations météo adaptées pour les pilotes de drone en Belgique.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <aside className="lg:col-span-1 space-y-6">
            <DroneProfileSelector
              selectedModel={selectedDroneModel}
              onModelChange={handleDroneModelChange}
            />
            {selectedDroneModel === DRONE_MODELS.CUSTOM && (
              <CustomDroneParamsForm
                initialValues={customDroneParams}
                onSubmit={handleCustomParamsSubmit}
              />
            )}
            <Separator className="my-4" />
            <div className="p-4 bg-card rounded-lg shadow-md">
              <h3 className="font-semibold text-lg mb-2">Profil Actif : {activeDroneProfile.name}</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Vent max : {activeDroneProfile.maxWindSpeed} m/s</li>
                  <li>Plage Temp. : {activeDroneProfile.minTemp}°C à {activeDroneProfile.maxTemp}°C</li>
              </ul>
            </div>
          </aside>

          <main className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1 h-[400px] md:h-full">
              <MapComponent
                center={mapCenter}
                zoom={mapZoom}
                selectedCoordsForMarker={selectedCoords}
                onCoordsChange={handleCoordsChange}
                onCameraChange={handleCameraChange}
              />
            </div>
            <div className="md:col-span-1">
              <WeatherInfoComponent
                coords={selectedCoords}
                activeDroneProfile={activeDroneProfile}
              />
            </div>
          </main>
        </div>
        <footer className="text-center mt-8 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Propulsé par Open-Meteo, OpenWeatherMap et Google AI. Carte par Google Maps.
          </p>
        </footer>
        <Toaster />
      </div>
    </APIProvider>
  );
}
