
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Coordinates, DroneProfile, UnifiedWeatherResponse, SafetyAssessment, UnifiedCurrentWeatherData } from '@/types';
import { assessDroneSafety } from '@/ai/flows/assess-drone-safety';
import CurrentWeather from './CurrentWeather';
import HourlyForecastList from './HourlyForecastList';
import SafetyIndicator from './SafetyIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CloudOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WeatherInfoComponentProps {
  coords: Coordinates | null;
  activeDroneProfile: DroneProfile;
}

async function fetchWeather(coords: Coordinates): Promise<UnifiedWeatherResponse> {
  const { lat, lng } = coords;
  const response = await fetch(
    `/api/weather?lat=${lat}&lon=${lng}`
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `Erreur API (${response.status}). Impossible d'analyser les détails de l'erreur.`
    }));
    throw new Error(errorData.error || `Erreur API (${response.status}) lors de la récupération des données météo depuis votre route API.`);
  }
  return response.json();
}

export default function WeatherInfoComponent({ coords, activeDroneProfile }: WeatherInfoComponentProps) {
  const { toast } = useToast();
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessment | null>(null);
  const [isAssessingSafety, setIsAssessingSafety] = useState(false);

  const queryKey = useMemo(() => ['weather', coords], [coords]);

  const { data: weatherData, isLoading, error, isFetching, isError } = useQuery<UnifiedWeatherResponse, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!coords) throw new Error('Les coordonnées sont manquantes.');
      return fetchWeather(coords);
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, errorInstance) => {
      if (errorInstance.message.includes('Service météo principal indisponible') ||
          errorInstance.message.includes('Coordonnées invalides') ||
          errorInstance.message.includes('Échec de la récupération des données météo')) {
        return false; 
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isError && error) { 
      toast({
        title: "Erreur de récupération météo",
        description: error.message, 
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    if (weatherData?.current && activeDroneProfile) {
      const performAssessment = async () => {
        setIsAssessingSafety(true);
        setSafetyAssessment(null); 

        const currentData = weatherData.current as UnifiedCurrentWeatherData;
        
        const tempIsValid = typeof currentData.temp === 'number';
        const windSpeedIsValid = typeof currentData.wind?.speed === 'number';
        // We will derive windGustForAI, so we only need windSpeedIsValid for this part.
        const cloudCoverIsValid = typeof currentData.cloud_cover?.total === 'number';
        const visibilityIsValid = typeof currentData.visibility?.total === 'number';
        // cloudBaseHeight is optional for AI

        if (!tempIsValid || !windSpeedIsValid || !cloudCoverIsValid || !visibilityIsValid) {
          let missingFields: string[] = [];
          if (!tempIsValid) missingFields.push("température actuelle");
          if (!windSpeedIsValid) missingFields.push("vitesse du vent actuelle");
          // We handle windGust derivation below, so it won't be "missing" if speed is present.
          if (!cloudCoverIsValid) missingFields.push("couverture nuageuse");
          if (!visibilityIsValid) missingFields.push("visibilité");
          
          const warningMessage = `AI Safety Assessment: Critical weather data (${missingFields.join(', ')}) is missing or invalid. Cannot proceed with a reliable safety assessment. Data received: ${JSON.stringify(currentData)}`;
          console.warn(warningMessage);
          
          toast({
            title: "Évaluation de sécurité impossible",
            description: `Données météo essentielles (${missingFields.join(', ')}) manquantes pour une évaluation fiable.`,
            variant: "destructive",
          });
          setSafetyAssessment({
            safeToFly: false,
            indicatorColor: 'RED',
            message: `Données météo (${missingFields.join(', ')}) manquantes. Impossible d'évaluer la sécurité du vol.`,
          });
          setIsAssessingSafety(false);
          return; 
        }

        // All required fields (temp, windSpeed, cloudCover, visibility) are asserted to be numbers here due to the check above.
        // Derive windGustForAI: use actual gust if available, otherwise use wind speed.
        const windGustForAI = typeof currentData.wind?.gust === 'number' 
          ? currentData.wind.gust 
          : currentData.wind!.speed; // We know wind.speed is a number here.

        try {
          const assessmentInput = {
            temperature: currentData.temp as number, 
            windSpeed: currentData.wind!.speed as number, // Asserting non-null due to windSpeedIsValid check
            windGust: windGustForAI as number, // Ensured to be a number
            precipitationType: currentData.precipitation?.type || "none",
            maxWindSpeed: activeDroneProfile.maxWindSpeed,
            minTemperature: activeDroneProfile.minTemp,
            maxTemperature: activeDroneProfile.maxTemp,
            cloudCover: currentData.cloud_cover!.total as number, // Asserting non-null due to cloudCoverIsValid check
            visibility: currentData.visibility!.total as number, // Asserting non-null due to visibilityIsValid check
            cloudBaseHeight: currentData.cloud_base_height ?? null, 
          };

          const assessmentResult = await assessDroneSafety(assessmentInput);
          setSafetyAssessment(assessmentResult);
        } catch (e: any) {
          console.error("L'évaluation de la sécurité a échoué (Genkit call):", e);
          toast({
            title: "Erreur d'évaluation de la sécurité IA",
            description: e.message || "Impossible d'évaluer la sécurité du drone pour le moment.",
            variant: "destructive",
          });
          setSafetyAssessment({
            safeToFly: false,
            indicatorColor: 'RED',
            message: 'Erreur lors de l\'évaluation IA de la sécurité. Les conditions pourraient être inadaptées.'
          });
        } finally {
          setIsAssessingSafety(false);
        }
      };
      performAssessment();
    } else {
      setSafetyAssessment(null); 
      if(weatherData && !weatherData.current){
        console.warn("Weather data fetched, but current weather details are missing.");
         toast({
            title: "Données météo actuelles manquantes",
            description: "Impossible de récupérer les conditions météo actuelles pour ce lieu.",
            variant: "destructive",
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherData, activeDroneProfile]); 

  if (!coords) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>Sélectionner un lieu</AlertTitle>
        <AlertDescription>Cliquez sur la carte pour sélectionner un lieu et afficher les données météo.</AlertDescription>
      </Alert>
    );
  }
  
  const showLoadingSkeleton = isLoading || isFetching || (weatherData?.current && isAssessingSafety && !safetyAssessment);

  if (showLoadingSkeleton) {
    return (
      <div className="space-y-6 mt-6 md:mt-0">
        <Skeleton className="h-24 w-full rounded-lg" /> 
        <Skeleton className="h-64 w-full rounded-lg" /> 
        <Skeleton className="h-48 w-full rounded-lg" /> 
      </div>
    );
  }

  if (isError && error) { 
    return (
      <Alert variant="destructive" className="mt-6 shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Erreur de données météo</AlertTitle>
        <AlertDescription>
          Impossible de charger les informations météo pour le lieu sélectionné.
          Veuillez vérifier votre connexion ou réessayer plus tard. Détail: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !weatherData.current) {
    // This case also covers when API returns data but current is null.
    let description = "Aucune donnée météo actuelle n'a été trouvée pour le lieu sélectionné ou les données sont incomplètes.";
    if (isError && error?.message) { // If there was a fetch error leading to no data
      description = error.message;
    } else if (weatherData && !weatherData.current) {
      description = "Les données météo actuelles pour ce lieu sont manquantes dans la réponse du service.";
    }
    return (
      <Alert variant="destructive" className="mt-6 shadow-md">
         <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Données météo non disponibles</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6 mt-6 md:mt-0">
      {isAssessingSafety && !safetyAssessment ? ( 
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <SafetyIndicator assessment={safetyAssessment} />
      )}
      {weatherData.current && <CurrentWeather data={weatherData.current} />}
      {weatherData.hourly?.data && weatherData.hourly.data.length > 0 && <HourlyForecastList data={weatherData.hourly.data} />}
    </div>
  );
}

