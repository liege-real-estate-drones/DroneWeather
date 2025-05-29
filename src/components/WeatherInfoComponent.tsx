
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
        setSafetyAssessment(null);

        const currentData = weatherData.current;
        const tempIsValid = typeof currentData.temp === 'number';
        const windIsValid = currentData.wind && typeof currentData.wind.speed === 'number' && typeof currentData.wind.gust === 'number';

        if (!tempIsValid || !windIsValid) {
          console.error("Weather data for assessment is incomplete:", {
            temp: currentData.temp,
            windSpeed: currentData.wind?.speed,
            windGust: currentData.wind?.gust,
          });
          toast({
            title: "Évaluation de sécurité impossible",
            description: "Données météo essentielles (température, vitesse/rafales de vent) manquantes pour l'évaluation.",
            variant: "destructive",
          });
          setSafetyAssessment({
            safeToFly: false,
            indicatorColor: 'RED',
            message: 'Données météo incomplètes. Impossible d\'évaluer la sécurité du vol.'
          });
          setIsAssessingSafety(false);
          return; 
        }

        try {
          const assessmentInput = {
            temperature: currentData.temp,
            windSpeed: currentData.wind.speed,
            windGust: currentData.wind.gust,
            precipitationType: currentData.precipitation.type,
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
  
  const showLoadingSkeleton = isLoading || isFetching || (weatherData?.current && isAssessingSafety && !safetyAssessment);

  if (showLoadingSkeleton) {
    return (
      <div className="space-y-6 mt-6">
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
        <AlertTitle>Erreur lors de la récupération de la météo</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !weatherData.current) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>Aucune donnée météo</AlertTitle>
        <AlertDescription>Impossible de récupérer les données météo pour le lieu sélectionné. Veuillez réessayer ou sélectionner un autre lieu.</AlertDescription>
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
      {weatherData.hourly?.data && <HourlyForecastList data={weatherData.hourly.data} />}
    </div>
  );
}
