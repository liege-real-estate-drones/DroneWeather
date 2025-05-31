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
import { PlaneTakeoff, MapPin, LocateFixed, Save, Plane, Settings, Layers, Mountain, AlertTriangle, Loader2, Filter, Palette } from 'lucide-react'; // Added Palette
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

// Function to fetch UAV (Unmanned Aerial Vehicle) zones data from the API
// It can filter for currently active zones if filterActive is true
const fetchUAVZones = async (filterActive: boolean): Promise<GeoJSONFeatureCollection | null> => {
  const params = new URLSearchParams();
  if (filterActive) {
    params.append('time', 'now'); // Add time=now parameter for active zones
  }
  const response = await fetch(`/api/uav-zones?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from UAV zones API' }));
    console.error('Error fetching UAV zones:', errorData);
    throw new Error(errorData.error || `Failed to fetch UAV zones: ${response.statusText}`);
  }
  return response.json();
};

// Function to fetch elevation data for given coordinates from the API
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
  // State for selected coordinates on the map
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(ROLOUX_COORDS);
  // State for map center coordinates
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(ROLOUX_COORDS);
  // State for map zoom level
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  
  // State for the selected drone model name
  const [selectedDroneModel, setSelectedDroneModel] = useState<string>(DJI_MINI_4_PRO_PROFILE.name);
  // State for custom drone parameters (excluding name, as 'notes' is now part of this type)
  const [customDroneParams, setCustomDroneParams] = useState<Omit<DroneProfile, 'name'>>(DJI_MINI_4_PRO_PROFILE);
  
  // State to track if the component has mounted on the client-side
  const [isClient, setIsClient] = useState(false);
  // State to track if geolocation is in progress
  const [isLocating, setIsLocating] = useState(false);
  // State to control the visibility of the settings panel
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Hook for displaying toast notifications
  const { toast } = useToast();

  // State to control visibility of UAV zones layer on the map
  const [showUAVZones, setShowUAVZones] = useState(false);
  // State to filter UAV zones to show only currently active ones
  const [filterActiveUAVZones, setFilterActiveUAVZones] = useState(false);

  // Google Maps API key from environment variables
  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;
  // Hook to load Google Maps geometry library
  const geometryLibrary = useMapsLibrary('geometry');

  // React Query hook to fetch UAV zones data
  const {
    data: uavZonesData,
    isLoading: isLoadingUAVZones,
    error: uavZonesError,
    refetch: refetchUAVZones, 
  } = useQuery<GeoJSONFeatureCollection | null, Error>({
    queryKey: ['uavZones', filterActiveUAVZones], // Query key includes filter state
    queryFn: () => fetchUAVZones(filterActiveUAVZones),
    enabled: showUAVZones, // Query only runs if showUAVZones is true
    staleTime: 1000 * 60 * 15, // Cache data for 15 minutes
    gcTime: 1000 * 60 * 30,    // Garbage collect data after 30 minutes
    retry: 1,                  // Retry failed query once
  });

  // Effect to refetch UAV zones when 'showUAVZones' becomes true and data isn't already loading/fetched
  useEffect(() => {
    if (showUAVZones && !isLoadingUAVZones && !uavZonesData) {
      refetchUAVZones();
    }
  }, [showUAVZones, isLoadingUAVZones, uavZonesData, refetchUAVZones]);

  // React Query hook to fetch elevation data
  const {
    data: elevationData,
    isLoading: isLoadingElevation,
    error: elevationError,
  } = useQuery<{ elevation: number | null } | null, Error>({
    queryKey: ['elevation', selectedCoords], // Query key includes selected coordinates
    queryFn: () => fetchElevation(selectedCoords),
    enabled: !!selectedCoords && !!googleMapsApiKey, // Query runs if coordinates and API key are available
    staleTime: Infinity, // Cache elevation data indefinitely
    gcTime: 1000 * 60 * 60 * 24, // Garbage collect after 24 hours
    retry: 1,
  });

  // Effect to display toast notification on UAV zones fetch error
  useEffect(() => {
    if (uavZonesError) {
      toast({
        title: "Erreur Zones UAV",
        description: uavZonesError.message || "Une erreur est survenue lors du chargement des zones UAV.",
        variant: "destructive",
      });
    }
  }, [uavZonesError, toast]);

  // Effect to display toast notification on elevation fetch error
  useEffect(() => {
    if (elevationError) {
      toast({
        title: "Erreur d'altitude",
        description: elevationError.message || "Impossible de récupérer l'altitude du point sélectionné.",
        variant: "destructive",
      });
    }
  }, [elevationError, toast]);

  // Effect to run on component mount (client-side only)
  useEffect(() => {
    setIsClient(true); // Indicate that the component has mounted
    let initialCoords = ROLOUX_COORDS;
    let initialMapCenter = ROLOUX_COORDS;
    let initialMapZoom = DEFAULT_MAP_ZOOM;

    // Load saved location from localStorage
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

    // Load saved drone model and custom parameters from localStorage
    try {
      const savedDroneModel = localStorage.getItem(LOCAL_STORAGE_DEFAULT_DRONE_KEY);
      const allModelNames = [...DEFAULT_DRONE_PROFILES.map(p => p.name), DRONE_MODELS.CUSTOM];
      if (savedDroneModel && allModelNames.includes(savedDroneModel)) {
        setSelectedDroneModel(savedDroneModel);
         const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === savedDroneModel);
        if (profile) {
             setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp, notes: profile.notes });
        } else if (savedDroneModel === DRONE_MODELS.CUSTOM) {
           const savedCustomParamsString = localStorage.getItem('droneWeatherAppCustomDroneParams');
           if (savedCustomParamsString) {
             setCustomDroneParams(JSON.parse(savedCustomParamsString));
           } else {
            const fallbackProfile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
            setCustomDroneParams({maxWindSpeed: fallbackProfile.maxWindSpeed, minTemp: fallbackProfile.minTemp, maxTemp: fallbackProfile.maxTemp, notes: fallbackProfile.notes});
           }
        }
      } else { // Default to DJI Mini 4 Pro if no saved drone
        setSelectedDroneModel(DJI_MINI_4_PRO_PROFILE.name);
        const djiMini4Profile = DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
        setCustomDroneParams({ maxWindSpeed: djiMini4Profile.maxWindSpeed, minTemp: djiMini4Profile.minTemp, maxTemp: djiMini4Profile.maxTemp, notes: djiMini4Profile.notes });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du drone par défaut depuis localStorage:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Callback to handle coordinate changes from the map
  const handleCoordsChange = useCallback((coords: Coordinates) => {
    setSelectedCoords(coords);
    setMapCenter({ lat: coords.lat, lng: coords.lng }); // Recenter map on new selection
    setMapZoom(DEFAULT_MAP_ZOOM + 2); // Zoom in slightly on new selection
  }, []);

  // Callback to handle map camera changes (pan, zoom)
  const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
    const newCenter = ev.detail.center;
    const newZoom = ev.detail.zoom;
    setMapCenter({ lat: newCenter.lat, lng: newCenter.lng });
    setMapZoom(newZoom);
  }, []);

  // Handler for drone model selection change
  const handleDroneModelChange = (modelName: string) => {
    setSelectedDroneModel(modelName);
    if (modelName !== DRONE_MODELS.CUSTOM) {
      const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === modelName);
      if (profile) {
        // Update customDroneParams with the selected profile's values
        setCustomDroneParams({ maxWindSpeed: profile.maxWindSpeed, minTemp: profile.minTemp, maxTemp: profile.maxTemp, notes: profile.notes });
      }
    }
  };

  // Handler for submitting custom drone parameters
  const handleCustomParamsSubmit = (data: Omit<DroneProfile, 'name'>) => { // Data from form won't include 'name'
    setCustomDroneParams(data); // data already includes notes if the form supports it, or notes will be undefined
    setSelectedDroneModel(DRONE_MODELS.CUSTOM);
    try {
      localStorage.setItem('droneWeatherAppCustomDroneParams', JSON.stringify(data));
      toast({ title: "Paramètres personnalisés sauvegardés", description: "Vos paramètres de drone personnalisés sont maintenant actifs et sauvegardés localement." });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres personnalisés:", error);
      toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder les paramètres personnalisés.", variant: "destructive" });
    }
  };

  // Handler for "Locate Me" button
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
      { timeout: 10000 } // Timeout after 10 seconds
    );
  };

  // Handler to save the current location as default
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

  // Handler to save the current drone model (and custom params if applicable) as default
  const handleSaveDefaultDrone = () => {
    if (selectedDroneModel) {
      try {
        localStorage.setItem(LOCAL_STORAGE_DEFAULT_DRONE_KEY, selectedDroneModel);
        if (selectedDroneModel === DRONE_MODELS.CUSTOM) {
          localStorage.setItem('droneWeatherAppCustomDroneParams', JSON.stringify(customDroneParams));
        }
        toast({ title: "Drone par défaut sauvegardé", description: `${selectedDroneModel} sera sélectionné au prochain démarrage.` });
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du drone par défaut:", error);
        toast({ title: "Erreur de sauvegarde", description: "Impossible de sauvegarder le drone par défaut.", variant: "destructive" });
      }
    }
  };

  // Memoized active drone profile based on selection and custom parameters
  const activeDroneProfile: DroneProfile = useMemo(() => {
    if (selectedDroneModel === DRONE_MODELS.CUSTOM) {
      // Ensure notes is handled correctly, it's optional in Omit<DroneProfile, 'name'>
      return { name: DRONE_MODELS.CUSTOM, ...customDroneParams };
    }
    const profile = DEFAULT_DRONE_PROFILES.find(p => p.name === selectedDroneModel);
    // Fallback to a default profile if the selected one isn't found (shouldn't happen with current logic)
    return profile || DEFAULT_DRONE_PROFILES.find(p => p.name === DJI_MINI_4_PRO_PROFILE.name) || DJI_MINI_4_PRO_PROFILE;
  }, [selectedDroneModel, customDroneParams]);

  // Memoized calculation to find if the selected coordinates intersect with any UAV zone
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

  // Display loading indicator if client-side hydration is not complete
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <PlaneTakeoff size={64} className="text-primary animate-pulse mb-4" />
        <p className="text-xl text-muted-foreground">Chargement de DroneWeather...</p>
      </div>
    );
  }

  // Display error if Google Maps API key is missing
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
        {/* Header Section */}
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
          {/* Settings Panel Trigger */}
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
                {/* Drone Profile Settings */}
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
                {/* Location Settings */}
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
              <SheetFooter className="mt-4"> 
                <SheetClose asChild>
                  <Button type="button" variant="outline">Fermer</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </header>
        
        {/* Main Content Area - Info Cards */}
        <div className="mb-6 space-y-4">
          {/* Active Drone Profile Card */}
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

          {/* UAV Zones Filters Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Palette size={20} /> 
                Filtres des Zones UAV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor="uav-zones-toggle-main" className="text-base flex items-center gap-2">
                  <Layers size={18} /> Afficher Zones UAV
                </Label>
                <Switch
                  id="uav-zones-toggle-main"
                  checked={showUAVZones}
                  onCheckedChange={setShowUAVZones}
                />
              </div>
              {isLoadingUAVZones && showUAVZones && 
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Chargement des zones UAV...
                </div>
              }
              {showUAVZones && (
                <div className="flex items-center justify-between space-x-2 py-2 pl-1">
                  <Label htmlFor="filter-active-uav-zones-toggle-main" className="text-base flex items-center gap-2">
                    <Filter size={18} /> Uniquement Actives (Maintenant)
                  </Label>
                  <Switch
                    id="filter-active-uav-zones-toggle-main"
                    checked={filterActiveUAVZones}
                    onCheckedChange={setFilterActiveUAVZones}
                    disabled={isLoadingUAVZones || uavZonesError !== null}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Point Info Card */}
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
                  <AlertTriangle size={16} className={intersectingUAVZone ? 'text-destructive' : (showUAVZones ? 'text-green-500' : 'text-muted-foreground')} />
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

        {/* Main Layout Grid - Map and Weather Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          {/* Map Component Area */}
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
          {/* Weather Info Component Area */}
          <div className="lg:col-span-2">
            <WeatherInfoComponent
              coords={selectedCoords}
              activeDroneProfile={activeDroneProfile}
            />
          </div>
        </div>
        {/* Footer */}
        <footer className="text-center mt-8 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Météo par Open-Meteo & OpenWeatherMap. Zones UAV via services.arcgis.com & Skeyes. Carte & Altitude par Google Maps. IA par Google Gemini.
          </p>
        </footer>
      </div>
    </APIProvider>
  );
}
