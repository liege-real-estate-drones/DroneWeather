
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Coordinates, DroneProfile, MeteosourceResponse, SafetyAssessment } from '@/types';
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

async function fetchWeather(coords: Coordinates): Promise<MeteosourceResponse> {
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

  const { data: weatherData, isLoading, error, isFetching, isError } = useQuery<MeteosourceResponse, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!coords) throw new Error('Les coordonnées sont manquantes.');
      return fetchWeather(coords);
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, errorInstance) => {
      if (errorInstance.message.includes('service météo n\'est pas configuré') ||
          errorInstance.message.includes('Erreur Meteosource :') || 
          errorInstance.message.includes('Coordonnées invalides') ||
          errorInstance.message.includes('paramètre invalide')) {
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
        setSafetyAssessment(null); // Reset assessment at the beginning

        const currentData = weatherData.current;
        const tempIsValid = typeof currentData.temp === 'number';
        const windSpeedIsValid = currentData.wind && typeof currentData.wind.speed === 'number';
        const windGustIsValid = currentData.wind && typeof currentData.wind.gust === 'number';

        if (!tempIsValid || !windSpeedIsValid || !windGustIsValid) {
          console.warn(
            `AI Safety Assessment: Weather data from API is incomplete or invalid for assessment. Required numeric fields: ` +
            `Temperature (received: ${currentData.temp}), ` +
            `Wind Speed (received: ${currentData.wind?.speed}), ` +
            `Wind Gust (received: ${currentData.wind?.gust}). ` +
            `Assessment will default to unsafe.`
          );
          toast({
            title: "Évaluation de sécurité impossible",
            description: "Données météo essentielles (température, vitesse/rafales de vent) manquantes ou invalides pour l'évaluation.",
            variant: "destructive",
          });
          setSafetyAssessment({
            safeToFly: false,
            indicatorColor: 'RED',
            message: 'Données météo incomplètes ou invalides. Impossible d\'évaluer la sécurité du vol.'
          });
          setIsAssessingSafety(false);
          return; 
        }

        try {
          const assessmentInput = {
            temperature: currentData.temp, // Known to be a number here
            windSpeed: currentData.wind.speed, // Known to be a number here
            windGust: currentData.wind.gust, // Known to be a number here
            precipitationType: currentData.precipitation?.type || "none", // Default to "none" if undefined
            maxWindSpeed: activeDroneProfile.maxWindSpeed,
            minTemperature: activeDroneProfile.minTemp,
            maxTemperature: activeDroneProfile.maxTemp,
          };
          const assessmentResult = await assessDroneSafety(assessmentInput);
          setSafetyAssessment(assessmentResult);
        } catch (e: any) {
          console.error("L'évaluation de la sécurité a échoué:", e);
          toast({
            title: "Erreur d'évaluation de la sécurité",
            description: e.message || "Impossible d'évaluer la sécurité du drone pour le moment.",
            variant: "destructive",
          });
          setSafetyAssessment({
            safeToFly: false,
            indicatorColor: 'RED',
            message: 'Erreur lors de l\'évaluation de la sécurité. Les conditions pourraient être inadaptées.'
          });
        } finally {
          setIsAssessingSafety(false);
        }
      };
      performAssessment();
    } else {
      // Reset assessment if there's no current weather data or no active drone profile
      // This handles cases where coords are deselected or weatherData becomes null
      setSafetyAssessment(null);
    }
  }, [weatherData, activeDroneProfile, toast]);

  if (!coords) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>Sélectionner un lieu</AlertTitle>
        <AlertDescription>Cliquez sur la carte pour sélectionner un lieu et afficher les données météo.</AlertDescription>
      </Alert>
    );
  }
  
  // More specific loading state: show skeleton if query is loading/fetching,
  // OR if we have current data but are still waiting for AI assessment.
  const showLoadingSkeleton = isLoading || isFetching || (weatherData?.current && isAssessingSafety && !safetyAssessment);


  if (showLoadingSkeleton) {
    return (
      <div className="space-y-6 mt-6 md:mt-0">
        <Skeleton className="h-24 w-full rounded-lg" /> {/* SafetyIndicator placeholder */}
        <Skeleton className="h-64 w-full rounded-lg" /> {/* CurrentWeather placeholder */}
        <Skeleton className="h-48 w-full rounded-lg" /> {/* HourlyForecast placeholder */}
      </div>
    );
  }

  if (isError && error) { 
    // This specific error message is already handled by a toast.
    // We can show a more generic error message here in the component body.
    return (
      <Alert variant="destructive" className="mt-6 shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Erreur de données météo</AlertTitle>
        <AlertDescription>
          Impossible de charger les informations météo pour le lieu sélectionné.
          Veuillez vérifier votre connexion ou réessayer plus tard. Message: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !weatherData.current) {
    // This case might occur if the API call succeeds but returns no 'current' data,
    // or if coords become valid but data fetching hasn't completed yet (though isLoading/isFetching should cover that)
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>Aucune donnée météo actuelle</AlertTitle>
        <AlertDescription>
          Aucune donnée météo actuelle n'a été trouvée pour le lieu sélectionné. 
          Cela peut arriver si l'API ne fournit pas de données pour ce point précis.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6 mt-6 md:mt-0">
      {isAssessingSafety && !safetyAssessment ? ( // Show skeleton for safety indicator only when assessing
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <SafetyIndicator assessment={safetyAssessment} />
      )}
      {weatherData.current && <CurrentWeather data={weatherData.current} />}
      {weatherData.hourly?.data && weatherData.hourly.data.length > 0 && <HourlyForecastList data={weatherData.hourly.data} />}
    </div>
  );
}
