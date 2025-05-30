
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
import { PlaneTakeoff, MapPinOff, LocateFixed, Save, Plane, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { APIProvider, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import MapComponent from '@/components/MapComponent';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

interface SavedLocationState {
  selectedCoords: Coordinates;
  mapCenter: google.maps.LatLngLiteral;
  mapZoom: number;
}

export default function HomePage() {
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(ROLOUX_COORDS);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(ROLOUX_COORDS);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  
  const [selectedDroneModel, setSelectedDroneModel] = useState<string>(DJI_MINI_4_PRO_PROFILE.name);
  const [customDroneParams, setCustomDroneParams] = useState<Omit<DroneProfile, 'name' | 'notes'>>(DJI_MINI_4_PRO_PROFILE);
  
  const [isClient, setIsClient] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

  useEffect(() => {
    setIsClient(true);
    let initialCoords = ROLOUX_COORDS;
    let initialMapCenter = ROLOUX_COORDS;
    let initialMapZoom = DEFAULT_MAP_ZOOM;

    try {
      const savedLocationString = localStorage.getItem(LOCAL_STORAGE_DEFAULT_LOCATION_KEY);
      if (savedLocationString) {
        const savedLocation: SavedLocationState = JSON.parse(savedLocationString);
        if (savedLocation.selectedCoords && savedLocation.mapCenter && typeof savedLocation.mapZoom === 'number') {
          initialCoords = savedLocation.selectedCoords;
          initialMapCenter = savedLocation.mapCenter;
          initialMapZoom = savedLocation.mapZoom;
          toast({ title: "Lieu par défaut chargé", description: "Votre lieu sauvegardé a été chargé." });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du lieu par défaut depuis localStorage:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger le lieu par défaut.", variant: "destructive" });
    }
    setSelectedCoords(initialCoords);
    setMapCenter(initialMapCenter);
    setMapZoom(initialMapZoom);

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
        } else {
           const fallbackProfile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
           setCustomDroneParams({maxWindSpeed: fallbackProfile.maxWindSpeed, minTemp: fallbackProfile.minTemp, maxTemp: fallbackProfile.maxTemp});
        }
        toast({ title: "Profil de drone par défaut chargé", description: `Le profil pour ${savedDroneModel} a été chargé.` });
      } else {
        setSelectedDroneModel(DJI_MINI_4_PRO_PROFILE.name);
        const djiMini4Profile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
        setCustomDroneParams({ maxWindSpeed: djiMini4Profile.maxWindSpeed, minTemp: djiMini4Profile.minTemp, maxTemp: djiMini4Profile.maxTemp });
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
    // setIsSettingsOpen(false); // Keep settings open if user wants to save this as default drone
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
        // setIsSettingsOpen(false); // REMOVED: Keep settings sheet open
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
    const fallbackProfile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
    return profile || { name: selectedDroneModel, ...customDroneParams, notes: "Default profile or custom values for a named drone." } as DroneProfile;
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
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary flex items-center gap-2">
              <PlaneTakeoff size={40} />
              DroneWeather
            </h1>
            <p className="text-lg text-muted-foreground">
              Informations météo adaptées pour les pilotes de drone en Belgique.
            </p>
          </div>
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Ouvrir les paramètres</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Paramètres</SheetTitle>
                <SheetDescription>
                  Configurez votre expérience DroneWeather ici.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-6 py-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Profil de Drone</h3>
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
                  <Button onClick={handleSaveDefaultDrone} variant="outline" className="w-full mt-4">
                    <Plane className="mr-2 h-4 w-4" />
                    Enregistrer Drone Défaut
                  </Button>
                </div>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Localisation</h3>
                  <div className="space-y-2">
                    <Button onClick={handleLocateMe} disabled={isLocating} variant="outline" className="w-full">
                      <LocateFixed className="mr-2 h-4 w-4" />
                      {isLocating ? "Localisation..." : "Me Localiser"}
                    </Button>
                    <Button onClick={handleSaveDefaultLocation} variant="outline" className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer Lieu Défaut
                    </Button>
                  </div>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="outline">Fermer</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </header>
        
        {activeDroneProfile && (
          <div className="mb-6 p-4 bg-card rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2 text-primary">Profil Actif : {activeDroneProfile.name}</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Vent max : {activeDroneProfile.maxWindSpeed} m/s</li>
                <li>Plage Temp. : {activeDroneProfile.minTemp}°C à {activeDroneProfile.maxTemp}°C</li>
                {activeDroneProfile.notes && (
                      <li className="italic text-xs mt-1">Note: {activeDroneProfile.notes}</li>
                )}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <div className="lg:col-span-1 h-[400px] lg:h-full">
            <MapComponent
              center={mapCenter}
              zoom={mapZoom}
              selectedCoordsForMarker={selectedCoords}
              onCoordsChange={handleCoordsChange}
              onCameraChange={handleCameraChange}
            />
          </div>
          <div className="lg:col-span-2">
            <WeatherInfoComponent
              coords={selectedCoords}
              activeDroneProfile={activeDroneProfile}
            />
          </div>
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
