"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ApiKeyInput from '@/components/ApiKeyInput';
import WeatherInfoComponent from '@/components/WeatherInfoComponent';
import DroneProfileSelector from '@/components/DroneProfileSelector';
import CustomDroneParamsForm from '@/components/CustomDroneParamsForm';
import { DEFAULT_DRONE_PROFILES, DJI_MINI_4_PRO_PROFILE, DRONE_MODELS } from '@/lib/constants';
import type { Coordinates, DroneProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PlaneTakeoff } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] md:h-full w-full rounded-lg shadow-lg" />,
});

export default function HomePage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);
  const [selectedDroneModel, setSelectedDroneModel] = useState<string>(DRONE_MODELS.MINI_4_PRO);
  const [customDroneParams, setCustomDroneParams] = useState<Omit<DroneProfile, 'name'>>(DJI_MINI_4_PRO_PROFILE);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const storedApiKey = localStorage.getItem('meteosourceApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    if (isClient) {
      localStorage.setItem('meteosourceApiKey', newApiKey);
    }
    toast({ title: "API Key Saved", description: "Your Meteosource API key has been saved locally." });
  };

  const handleCoordsChange = (coords: Coordinates) => {
    setSelectedCoords(coords);
  };

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
    toast({ title: "Custom Parameters Saved", description: "Your custom drone parameters are now active." });
  };

  const activeDroneProfile: DroneProfile = useMemo(() => {
    if (selectedDroneModel === DRONE_MODELS.CUSTOM) {
      return { name: DRONE_MODELS.CUSTOM, ...customDroneParams };
    }
    const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === selectedDroneModel);
    return profile || { name: selectedDroneModel, ...customDroneParams }; // Fallback, should always find one
  }, [selectedDroneModel, customDroneParams]);


  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <PlaneTakeoff size={64} className="text-primary animate-pulse mb-4" />
        <p className="text-xl text-muted-foreground">Loading DroneWeather App...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background to-muted/30">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-primary flex items-center gap-2">
          <PlaneTakeoff size={40} />
          DroneWeather
        </h1>
        <p className="text-lg text-muted-foreground">
          Tailored weather information for drone pilots in Belgium.
        </p>
      </header>

      <ApiKeyInput apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

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
             <h3 className="font-semibold text-lg mb-2">Active Profile: {activeDroneProfile.name}</h3>
             <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Max Wind: {activeDroneProfile.maxWindSpeed} m/s</li>
                <li>Temp Range: {activeDroneProfile.minTemp}°C to {activeDroneProfile.maxTemp}°C</li>
             </ul>
           </div>
        </aside>

        <main className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1 h-[400px] md:h-auto">
            <MapComponent selectedCoords={selectedCoords} onCoordsChange={handleCoordsChange} />
          </div>
          <div className="md:col-span-1">
            <WeatherInfoComponent
              apiKey={apiKey}
              coords={selectedCoords}
              activeDroneProfile={activeDroneProfile}
            />
          </div>
        </main>
      </div>
       <footer className="text-center mt-8 py-4 border-t">
        <p className="text-sm text-muted-foreground">
          Powered by <a href="https://www.meteosource.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meteosource</a> and Genkit AI.
        </p>
      </footer>
      <Toaster />
    </div>
  );
}
