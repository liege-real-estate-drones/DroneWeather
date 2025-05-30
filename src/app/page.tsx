
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import WeatherInfoComponent from '@/components/WeatherInfoComponent';
import DroneProfileSelector from '@/components/DroneProfileSelector';
import CustomDroneParamsForm from '@/components/CustomDroneParamsForm';
import {
  DEFAULT_DRONE_PROFILES,
  DJI_MINI_4_PRO_PROFILE,
  DRONE_MODELS,
  ROLOUX_COORDS,
  DEFAULT_MAP_ZOOM,
  LOCAL_STORAGE_DEFAULT_LOCATION_KEY,
  LOCAL_STORAGE_DEFAULT_DRONE_KEY
} from '@/lib/constants';
import type { Coordinates, DroneProfile } from '@/types';
import { Separator } from '@/components/ui/separator';
import { PlaneTakeoff, MapPinOff, LocateFixed, Save, Plane } from 'lucide-react'; // Changed Drone to Plane
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { APIProvider, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import MapComponent from '@/components/MapComponent';

interface SavedLocationState {
  selectedCoords: Coordinates;
  mapCenter: google.maps.LatLngLiteral;
  mapZoom: number;
}

export default function HomePage() {
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(ROLOUX_COORDS);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: ROLOUX_COORDS.lat, lng: ROLOUX_COORDS.lng });
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  
  const [selectedDroneModel, setSelectedDroneModel] = useState<string>(DJI_MINI_4_PRO_PROFILE.name);
  const [customDroneParams, setCustomDroneParams] = useState<Omit<DroneProfile, 'name' | 'notes'>>(DJI_MINI_4_PRO_PROFILE);
  
  const [isClient, setIsClient] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();

  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

  useEffect(() => {
    setIsClient(true);
    // Load default location
    try {
      const savedLocationString = localStorage.getItem(LOCAL_STORAGE_DEFAULT_LOCATION_KEY);
      if (savedLocationString) {
        const savedLocation: SavedLocationState = JSON.parse(savedLocationString);
        if (savedLocation.selectedCoords && savedLocation.mapCenter && typeof savedLocation.mapZoom === 'number') {
          setSelectedCoords(savedLocation.selectedCoords);
          setMapCenter(savedLocation.mapCenter);
          setMapZoom(savedLocation.mapZoom);
          toast({ title: "Lieu par défaut chargé", description: "Votre lieu sauvegardé a été chargé." });
        }
      } else {
        setSelectedCoords(ROLOUX_COORDS);
        setMapCenter({ lat: ROLOUX_COORDS.lat, lng: ROLOUX_COORDS.lng });
        setMapZoom(DEFAULT_MAP_ZOOM);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du lieu par défaut depuis localStorage:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger le lieu par défaut.", variant: "destructive" });
    }

    // Load default drone
    try {
      const savedDroneModel = localStorage.getItem(LOCAL_STORAGE_DEFAULT_DRONE_KEY);
      const allModelNames = [...DEFAULT_DRONE_PROFILES.map(p => p.name), DRONE_MODELS.CUSTOM];
      if (savedDroneModel && allModelNames.includes(savedDroneModel)) {
        setSelectedDroneModel(savedDroneModel);
        if (savedDroneModel !== DRONE_MODELS.CUSTOM) {
          const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === savedDroneModel);
          if (profile) {
            setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp });
          }
        }
        toast({ title: "Profil de drone par défaut chargé", description: `Le profil pour ${savedDroneModel} a été chargé.` });
      } else {
        setSelectedDroneModel(DJI_MINI_4_PRO_PROFILE.name);
        setCustomDroneParams(DJI_MINI_4_PRO_PROFILE);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du drone par défaut depuis localStorage:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger le drone par défaut.", variant: "destructive" });
    }
  }, [toast]);

  const handleCoordsChange = useCallback((coords: Coordinates) => {
    setSelectedCoords(coords);
    setMapCenter({ lat: coords.lat, lng: coords.lng });
    setMapZoom(DEFAULT_MAP_ZOOM + 2); 
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

  const handleCustomParamsSubmit = (data: Omit<DroneProfile, 'name' | 'notes'>) => {
    setCustomDroneParams(data);
    setSelectedDroneModel(DRONE_MODELS.CUSTOM);
    toast({ title: "Paramètres personnalisés sauvegardés", description: "Vos paramètres de drone personnalisés sont maintenant actifs." });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Géolocalisation non supportée", description: "Votre navigateur ne supporte pas la géolocalisation.", variant: "destructive" });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        handleCoordsChange(coords); 
        toast({ title: "Position trouvée!", description: "Météo pour votre position actuelle." });
        setIsLocating(false);
      },
      (error) => {
        let message = "Impossible d'obtenir la position.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Permission de géolocalisation refusée.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Information de position non disponible.";
        } else if (error.code === error.TIMEOUT) {
          message = "La demande de géolocalisation a expiré.";
        }
        toast({ title: "Erreur de géolocalisation", description: message, variant: "destructive" });
        setIsLocating(false);
      },
      { timeout: 10000 } 
    );
  };

  const handleSaveDefaultLocation = () => {
    if (selectedCoords) {
      try {
        const locationToSave: SavedLocationState = {
          selectedCoords,
          mapCenter,
          mapZoom,
        };
        localStorage.setItem(LOCAL_STORAGE_DEFAULT_LOCATION_KEY, JSON.stringify(locationToSave));
        toast({ title: "Lieu par défaut sauvegardé", description: "Ce lieu sera chargé au prochain démarrage." });
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du lieu par défaut:", error);
        toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder le lieu par défaut.", variant: "destructive" });
      }
    } else {
      toast({ title: "Aucun lieu sélectionné", description: "Veuillez d'abord sélectionner un lieu sur la carte.", variant: "destructive" });
    }
  };

  const handleSaveDefaultDrone = () => {
    if (selectedDroneModel) {
      try {
        localStorage.setItem(LOCAL_STORAGE_DEFAULT_DRONE_KEY, selectedDroneModel);
        toast({ title: "Drone par défaut sauvegardé", description: `${selectedDroneModel} sera sélectionné au prochain démarrage.` });
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du drone par défaut:", error);
        toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder le drone par défaut.", variant: "destructive" });
      }
    }
  };

  const activeDroneProfile: DroneProfile = useMemo(() => {
    if (selectedDroneModel === DRONE_MODELS.CUSTOM) {
      return { name: DRONE_MODELS.CUSTOM, ...customDroneParams, notes: "Custom user parameters" };
    }
    const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === selectedDroneModel);
    return profile || { name: selectedDroneModel, ...customDroneParams, notes: "Default profile or custom values for a named drone." };
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
          <div className="flex flex-wrap gap-2 mt-2">
            <Button onClick={handleLocateMe} disabled={isLocating} variant="outline">
              <LocateFixed className="mr-2 h-4 w-4" />
              {isLocating ? "Localisation..." : "Me Localiser"}
            </Button>
            <Button onClick={handleSaveDefaultLocation} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Enregistrer Lieu Défaut
            </Button>
             <Button onClick={handleSaveDefaultDrone} variant="outline">
              <Plane className="mr-2 h-4 w-4" /> {/* Changed Drone to Plane */}
              Enregistrer Drone Défaut
            </Button>
          </div>
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
             {activeDroneProfile && (
                <div className="p-4 bg-card rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-2">Profil Actif : {activeDroneProfile.name}</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Vent max : {activeDroneProfile.maxWindSpeed} m/s</li>
                    <li>Plage Temp. : {activeDroneProfile.minTemp}°C à {activeDroneProfile.maxTemp}°C</li>
                    {activeDroneProfile.notes && (
                         <li className="italic text-xs mt-1">Note: {activeDroneProfile.notes}</li>
                    )}
                </ul>
                </div>
            )}
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
      </div>
    </APIProvider>
  );
}

