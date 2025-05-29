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
    // Utilisation d'une URL relative pour appeler votre propre route API
    `/api/weather?lat=${lat}&lon=${lng}`
  );
  if (!response.ok) {
    // Tenter de lire le corps de l'erreur comme JSON
    const errorData = await response.json().catch(() => ({ 
      // Fallback si le corps n'est pas JSON ou si l'analyse échoue
      error: `Erreur API (${response.status}). Impossible d'analyser les détails de l'erreur.` 
    }));
    // Utiliser le message d'erreur du backend s'il existe, sinon un message générique
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
      // Ne pas réessayer pour les erreurs de configuration serveur ou les erreurs de validation des paramètres (souvent 422)
      if (errorInstance.message.includes('service météo n\'est pas configuré') ||
          errorInstance.message.includes('Erreur Meteosource :') || // Indique une erreur relayée par notre backend
          errorInstance.message.includes('Coordonnées invalides') ||
          errorInstance.message.includes('paramètre invalide')) { // Message générique pour erreurs de validation
        return false;
      }
      // Limiter les nouvelles tentatives pour d'autres types d'erreurs
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isError && error) { // S'assurer que error n'est pas null quand isError est true
      toast({
        title: "Erreur de récupération météo",
        description: error.message, // Ce message devrait maintenant être plus détaillé grâce à la route API
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    if (weatherData?.current && activeDroneProfile) {
      const performAssessment = async () => {
        setIsAssessingSafety(true);
        setSafetyAssessment(null); 
        try {
          const assessmentInput = {
            temperature: weatherData.current!.temp,
            windSpeed: weatherData.current!.wind.speed,
            windGust: weatherData.current!.wind.gust,
            precipitationType: weatherData.current!.precipitation.type,
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

  if (isError && error) { // Afficher l'alerte d'erreur si react-query est en état d'erreur
    return (
      <Alert variant="destructive" className="mt-6 shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Erreur lors de la récupération de la météo</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !weatherData.current) {
     // Ce cas peut se produire si la requête réussit (pas d'erreur réseau/serveur) mais que Meteosource ne renvoie pas de données `current`
     // ou si weatherData est null après le chargement initial sans erreur explicite.
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
