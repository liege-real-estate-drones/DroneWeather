
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
import type { FeatureCollection as GeoJSONFeatureCollection, Feature as GeoJSONFeature, Geometry } from 'geojson';
import { Separator } from '@/components/ui/separator';
import { PlaneTakeoff, MapPin, LocateFixed, Save, Plane, Settings, Layers, Mountain, AlertTriangle, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { APIProvider, MapCameraChangedEvent, useMapsLibrary } from '@vis.gl/react-google-maps';
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SavedLocationState {
  selectedCoords: Coordinates;
  mapCenter: google.maps.LatLngLiteral;
  mapZoom: number;
}

const fetchUAVZones = async (filterActive: boolean): Promise<GeoJSONFeatureCollection | null> => {
  const params = new URLSearchParams();
  if (filterActive) {
    params.append('time', 'now');
  }
  const response = await fetch(`/api/uav-zones?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from UAV zones API' }));
    console.error('Error fetching UAV zones:', errorData);
    throw new Error(errorData.error || `Failed to fetch UAV zones: ${response.statusText}`);
  }
  return response.json();
};

const fetchElevation = async (coords: Coordinates | null): Promise<{ elevation: number | null } | null> => {
  if (!coords) return null;
  const response = await fetch(`/api/elevation?lat=${coords.lat}&lng=${coords.lng}`);
  if (!response.ok) {
    let errorJson: { error?: string; message?: string } = {};
    try {
      errorJson = await response.json();
    } catch (e) {
      console.warn('Failed to parse JSON error response from /api/elevation. Status:', response.status, response.statusText);
    }
    
    console.error('Error fetching elevation from /api/elevation. Status:', response.status, 'Response body:', errorJson);
    
    const errorMessage = (errorJson && typeof errorJson.error === 'string' && errorJson.error.trim() !== '')
      ? errorJson.error
      : `Échec de la récupération de l'altitude. Code d'état du serveur : ${response.status}. Vérifiez les logs du serveur. Réponse de /api/elevation : ${JSON.stringify(errorJson)}`;
      
    throw new Error(errorMessage);
  }
  return response.json();
};


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

  const [showUAVZones, setShowUAVZones] = useState(false);
  const [filterActiveUAVZones, setFilterActiveUAVZones] = useState(false);


  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;
  const geometryLibrary = useMapsLibrary('geometry');

  const {
    data: uavZonesData,
    isLoading: isLoadingUAVZones,
    error: uavZonesError,
  } = useQuery<GeoJSONFeatureCollection | null, Error>({
    queryKey: ['uavZones', filterActiveUAVZones], // Add filterActiveUAVZones to queryKey
    queryFn: () => fetchUAVZones(filterActiveUAVZones),
    enabled: showUAVZones,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });

  const {
    data: elevationData,
    isLoading: isLoadingElevation,
    error: elevationError,
  } = useQuery<{ elevation: number | null } | null, Error>({
    queryKey: ['elevation', selectedCoords],
    queryFn: () => fetchElevation(selectedCoords),
    enabled: !!selectedCoords && !!googleMapsApiKey, 
    staleTime: Infinity, 
    gcTime: 1000 * 60 * 60 * 24, 
    retry: 1,
  });


  useEffect(() => {
    if (uavZonesError) {
      toast({
        title: "Erreur Zones UAV",
        description: uavZonesError.message || "Une erreur est survenue lors du chargement des zones UAV.",
        variant: "destructive",
      });
    }
  }, [uavZonesError, toast]);

  useEffect(() => {
    if (elevationError) {
      toast({
        title: "Erreur d'altitude",
        description: elevationError.message || "Impossible de récupérer l'altitude du point sélectionné.",
        variant: "destructive",
      });
    }
  }, [elevationError, toast]);

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
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du lieu par défaut depuis localStorage:", error);
    }
    setSelectedCoords(initialCoords);
    setMapCenter(initialMapCenter);
    setMapZoom(initialMapZoom);

    try {
      const savedDroneModel = localStorage.getItem(LOCAL_STORAGE_DEFAULT_DRONE_KEY);
      const allModelNames = [...DEFAULT_DRONE_PROFILES.map(p => p.name), DRONE_MODELS.CUSTOM];
      if (savedDroneModel && allModelNames.includes(savedDroneModel)) {
        setSelectedDroneModel(savedDroneModel);
         const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === savedDroneModel);
        if (profile) {
             setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp, notes: profile.notes });
        } else if (savedDroneModel === DRONE_MODELS.CUSTOM) {
           const fallbackProfile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
           setCustomDroneParams({maxWindSpeed: fallbackProfile.maxWindSpeed, minTemp: fallbackProfile.minTemp, maxTemp: fallbackProfile.maxTemp, notes: fallbackProfile.notes});
        }
      } else {
        setSelectedDroneModel(DJI_MINI_4_PRO_PROFILE.name);
        const djiMini4Profile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
        setCustomDroneParams({ maxWindSpeed: djiMini4Profile.maxWindSpeed, minTemp: djiMini4Profile.minTemp, maxTemp: djiMini4Profile.maxTemp, notes: djiMini4Profile.notes });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du drone par défaut depuis localStorage:", error);
    }
  }, []); 

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
        setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp, notes: profile.notes });
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
      return { name: DRONE_MODELS.CUSTOM, ...customDroneParams, notes: customDroneParams.notes || "Paramètres utilisateur personnalisés" };
    }
    const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === selectedDroneModel);
    const fallbackProfile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
    
    const currentParams = (profile && selectedDroneModel !== DRONE_MODELS.CUSTOM) 
        ? { maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp, notes: profile.notes } 
        : customDroneParams;

    return profile || { name: selectedDroneModel, ...currentParams, notes: currentParams.notes || "Profil par défaut ou valeurs personnalisées." } as DroneProfile;
  }, [selectedDroneModel, customDroneParams]);

  const intersectingUAVZone = useMemo(() => {
    if (!selectedCoords || !uavZonesData?.features || !geometryLibrary || !showUAVZones) {
      return null;
    }

    const point = new google.maps.LatLng(selectedCoords.lat, selectedCoords.lng);

    for (const feature of uavZonesData.features) {
      if (feature.geometry) {
        const properties = feature.properties as any; 
        if (!properties) continue;

        if (feature.geometry.type === 'Polygon') {
          const coordinates = feature.geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }));
          const polygon = new google.maps.Polygon({ paths: coordinates });
          if (geometryLibrary.poly.containsLocation(point, polygon)) {
            return feature as GeoJSONFeature<Geometry, any>;
          }
        } 
        else if (feature.geometry.type === 'MultiPolygon') {
          for (const polyCoords of feature.geometry.coordinates) {
            const coordinates = polyCoords[0].map(coord => ({ lat: coord[1], lng: coord[0] }));
            const polygon = new google.maps.Polygon({ paths: coordinates });
            if (geometryLibrary.poly.containsLocation(point, polygon)) {
              return feature as GeoJSONFeature<Geometry, any>;
            }
          }
        }
      }
    }
    return null;
  }, [selectedCoords, uavZonesData, geometryLibrary, showUAVZones]);


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
        <MapPin size={64} className="text-destructive mb-4" />
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
              Informations météo et zones UAV pour les pilotes de drone en Belgique.
            </p>
          </div>
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Ouvrir les paramètres</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Paramètres</SheetTitle>
                <SheetDescription>
                  Configurez votre expérience DroneWeather.
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
                <Separator />
                 <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Layers className="text-primary" />
                    Couches Cartographiques
                  </h3>
                  <div className="flex items-center justify-between space-x-2 py-2">
                    <Label htmlFor="uav-zones-toggle" className="text-base">
                      Afficher Zones UAV
                    </Label>
                    <Switch
                      id="uav-zones-toggle"
                      checked={showUAVZones}
                      onCheckedChange={setShowUAVZones}
                    />
                  </div>
                  {isLoadingUAVZones && showUAVZones && <p className="text-sm text-muted-foreground">Chargement des zones UAV...</p>}
                  {showUAVZones && (
                    <div className="flex items-center justify-between space-x-2 py-2 mt-2">
                      <Label htmlFor="filter-active-uav-zones-toggle" className="text-base flex items-center gap-1">
                        <Filter size={16} />
                        Uniquement Actives (Maintenant)
                      </Label>
                      <Switch
                        id="filter-active-uav-zones-toggle"
                        checked={filterActiveUAVZones}
                        onCheckedChange={setFilterActiveUAVZones}
                      />
                    </div>
                  )}
                </div>
              </div>
              <SheetFooter className="mt-4"> 
                <SheetClose asChild>
                  <Button type="button" variant="outline">Fermer</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </header>
        
        <div className="mb-6 space-y-4">
          {activeDroneProfile && (
            <Card className="shadow-md">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg text-primary">Profil Actif : {activeDroneProfile.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground pt-0">
                  <p>Vent max : {activeDroneProfile.maxWindSpeed} m/s</p>
                  <p>Plage Temp. : {activeDroneProfile.minTemp}°C à {activeDroneProfile.maxTemp}°C</p>
                  {activeDroneProfile.notes && (
                        <p className="italic text-xs mt-1">Note: {activeDroneProfile.notes}</p>
                  )}
              </CardContent>
            </Card>
          )}

          {selectedCoords && (
            <Card className="shadow-md">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <MapPin size={20} /> Infos Point Sélectionné
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground pt-0">
                <p className="flex items-center gap-1">
                  <Mountain size={16} /> Altitude: 
                  {isLoadingElevation && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                  {elevationData && elevationData.elevation !== null && ` ${elevationData.elevation.toFixed(1)} m`}
                  {elevationData && elevationData.elevation === null && ' N/A'}
                  {elevationError && <span className="text-destructive ml-1">Erreur altitude</span>}
                </p>
                <div className="flex items-start gap-1">
                  <AlertTriangle size={16} className={intersectingUAVZone ? 'text-destructive' : 'text-green-500'} />
                  <span>
                    Statut Zone UAV: 
                    {!geometryLibrary && ' (Chargement géométrie...)'}
                    {geometryLibrary && !showUAVZones && ' (Couche UAV désactivée)'}
                    {geometryLibrary && showUAVZones && isLoadingUAVZones && <Loader2 className="h-4 w-4 animate-spin inline ml-1" />}
                    {geometryLibrary && showUAVZones && !isLoadingUAVZones && uavZonesError && <span className="text-destructive ml-1">Erreur chargement zones</span>}
                    {geometryLibrary && showUAVZones && !isLoadingUAVZones && uavZonesData && intersectingUAVZone && (
                      <span className="font-semibold text-destructive">
                        Dans la zone "{intersectingUAVZone.properties?.name || 'Nom inconnu'}"
                        <br />
                        <span className="font-normal">
                          Type: {intersectingUAVZone.properties?.categoryType || 'N/A'}, 
                          Statut: {intersectingUAVZone.properties?.status || 'N/A'}
                          <br />
                          Limites (AGL/AMSL): {intersectingUAVZone.properties?.lowerLimit || 'N/A'} {intersectingUAVZone.properties?.lowerAltitudeUnit || ''} ({intersectingUAVZone.properties?.lowerAltitudeReference || 'N/A'})
                          {' - '}
                          {intersectingUAVZone.properties?.upperLimit || 'N/A'} {intersectingUAVZone.properties?.upperAltitudeUnit || ''} ({intersectingUAVZone.properties?.upperAltitudeReference || 'N/A'})
                        </span>
                      </span>
                    )}
                    {geometryLibrary && showUAVZones && !isLoadingUAVZones && uavZonesData && !intersectingUAVZone && (
                      <span className="text-green-600"> Hors des zones UAV ({filterActiveUAVZones ? 'actives actuellement' : 'toutes'}).</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <div className="lg:col-span-1 h-[400px] lg:h-full">
            {googleMapsApiKey && (
                <MapComponent
                    center={mapCenter}
                    zoom={mapZoom}
                    selectedCoordsForMarker={selectedCoords}
                    onCoordsChange={handleCoordsChange}
                    onCameraChange={handleCameraChange}
                    uavZonesData={uavZonesData ?? undefined}
                    showUAVZones={showUAVZones}
                    isLoadingUAVZones={isLoadingUAVZones}
                />
            )}
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
            Météo par Open-Meteo & OpenWeatherMap. Zones UAV via services.arcgis.com & Skeyes. Carte & Altitude par Google Maps. IA par Google Gemini.
          </p>
        </footer>
      </div>
    </APIProvider>
  );
}
