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
  apiKey: string | null;
  coords: Coordinates | null;
  activeDroneProfile: DroneProfile;
}

async function fetchWeather(apiKey: string, coords: Coordinates): Promise<MeteosourceResponse> {
  const { lat, lng } = coords;
  const response = await fetch(
    `https://www.meteosource.com/api/v1/free/point?lat=${lat}&lon=${lng}&sections=current,hourly&language=fr&units=metric&key=${apiKey}`
  );
  if (!response.ok) {
    if (response.status === 429) { // Too many requests
      throw new Error('API rate limit exceeded. Please try again later or check your Meteosource plan.');
    }
    if (response.status === 401 || response.status === 403) { // Unauthorized or Forbidden
      throw new Error('Invalid or unauthorized API key. Please check your Meteosource API key.');
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch weather data.' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export default function WeatherInfoComponent({ apiKey, coords, activeDroneProfile }: WeatherInfoComponentProps) {
  const { toast } = useToast();
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessment | null>(null);
  const [isAssessingSafety, setIsAssessingSafety] = useState(false);

  const queryKey = useMemo(() => ['weather', apiKey, coords], [apiKey, coords]);

  const { data: weatherData, isLoading, error, isFetching } = useQuery<MeteosourceResponse, Error>({
    queryKey: queryKey,
    queryFn: () => {
      if (!apiKey) throw new Error('API key is missing.');
      if (!coords) throw new Error('Coordinates are missing.');
      return fetchWeather(apiKey, coords);
    },
    enabled: !!apiKey && !!coords,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry for auth errors or rate limit
      if (error.message.includes('API key') || error.message.includes('rate limit')) {
        return false;
      }
      return failureCount < 2; // Retry twice for other errors
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Weather Fetch Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (weatherData?.current && activeDroneProfile) {
      const performAssessment = async () => {
        setIsAssessingSafety(true);
        setSafetyAssessment(null); // Clear previous assessment
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
        } catch (e) {
          console.error("Safety assessment failed:", e);
          toast({
            title: "Safety Assessment Error",
            description: "Could not assess drone safety at this time.",
            variant: "destructive",
          });
          setSafetyAssessment({ // Fallback error state for safety indicator
            safeToFly: false,
            indicatorColor: 'RED',
            message: 'Error assessing safety. Conditions might be unsuitable.'
          });
        } finally {
          setIsAssessingSafety(false);
        }
      };
      performAssessment();
    } else {
      setSafetyAssessment(null); // Clear assessment if no data or profile
    }
  }, [weatherData, activeDroneProfile, toast]);

  if (!apiKey) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>API Key Required</AlertTitle>
        <AlertDescription>Please enter your Meteosource API key to view weather information.</AlertDescription>
      </Alert>
    );
  }

  if (!coords) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>Select Location</AlertTitle>
        <AlertDescription>Click on the map to select a location and view weather data.</AlertDescription>
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

  if (error) {
     // Error toast is already handled by useEffect, this is a fallback UI message.
    return (
      <Alert variant="destructive" className="mt-6 shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error Fetching Weather</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !weatherData.current) {
    return (
      <Alert variant="default" className="mt-6 shadow-md">
        <CloudOff className="h-5 w-5" />
        <AlertTitle>No Weather Data</AlertTitle>
        <AlertDescription>Could not retrieve weather data for the selected location. Please try again or select a different location.</AlertDescription>
      </Alert>
    );
  }
  

  return (
    <div className="space-y-6 mt-6 md:mt-0">
      <SafetyIndicator assessment={safetyAssessment} />
      {weatherData.current && <CurrentWeather data={weatherData.current} />}
      {weatherData.hourly?.data && <HourlyForecastList data={weatherData.hourly.data} />}
    </div>
  );
}
