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
  // apiKey: string | null; // REMOVED
  coords: Coordinates | null;
  activeDroneProfile: DroneProfile;
}

// MODIFIED fetchWeather function
async function fetchWeather(coords: Coordinates): Promise<MeteosourceResponse> {
  const { lat, lng } = coords;
  // Note: URL is now relative to your own application
  const response = await fetch(
    `/api/weather?lat=${lat}&lon=${lng}`
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch weather data from your API route.' }));
    // You might want to customize error messages based on status codes from your API route
    if (response.status === 500 && errorData.error?.includes('API key is not configured')) {
        throw new Error('The weather service is not configured on the server. Please contact the administrator.');
    }
    throw new Error(errorData.error || errorData.message || `API route error! status: ${response.status}`);
  }
  return response.json();
}

export default function WeatherInfoComponent({ /* apiKey, */ coords, activeDroneProfile }: WeatherInfoComponentProps) { // Remove apiKey from props
  const { toast } = useToast();
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessment | null>(null);
  const [isAssessingSafety, setIsAssessingSafety] = useState(false);

  // MODIFIED queryKey
  const queryKey = useMemo(() => ['weather', coords], [coords]); // apiKey removed

  const { data: weatherData, isLoading, error, isFetching } = useQuery<MeteosourceResponse, Error>({
    queryKey: queryKey,
    queryFn: () => {
      // if (!apiKey) throw new Error('API key is missing.'); // REMOVE THIS LINE
      if (!coords) throw new Error('Coordinates are missing.');
      return fetchWeather(coords); // apiKey no longer passed
    },
    enabled: !!coords, // apiKey no longer a condition
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry for auth errors or rate limit - API key errors are now server-side or generic client-side.
      // Consider if specific client-side error messages warrant no retries.
      // For example, if the error is "The weather service is not configured on the server...", retrying won't help.
      if (error.message.includes('weather service is not configured')) {
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

  // REMOVED API KEY CHECK BLOCK
  // if (!apiKey) {
  //   return (
  //     <Alert variant="default" className="mt-6 shadow-md">
  //       <AlertTriangle className="h-5 w-5" />
  //       <AlertTitle>API Key Required</AlertTitle>
  //       <AlertDescription>Please enter your Meteosource API key to view weather information.</AlertDescription>
  //     </Alert>
  //   );
  // }

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
