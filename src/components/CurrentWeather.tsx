
"use client";

import type { UnifiedCurrentWeatherData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Thermometer, Wind, Cloud, Eye, Droplets, Gauge, Navigation, Umbrella, Sunrise, Sunset, ArrowDownUp } from "lucide-react";
import Image from "next/image";
import { format, parseISO } from 'date-fns';

interface CurrentWeatherProps {
  data: UnifiedCurrentWeatherData;
}

const getWeatherIconUrl = (iconCode: string | number | undefined | null, summary?: string): string => {
  let hint = "weather";
  if (iconCode === null || typeof iconCode === 'undefined') {
    // Using a placeholder that clearly indicates data is missing, with a neutral background
    return `https://placehold.co/64x64.png?text=?&bg=e0e0e0&fg=757575`;
  }

  if (typeof iconCode === 'string') { // OpenWeatherMap icon code
    hint = summary || "weather"; // Use summary for better hint if available
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  } 
  
  // WMO Weather interpretation codes (Numbers from Open-Meteo)
  if ([0, 1].includes(iconCode)) hint = "sun clear";
  else if ([2, 3].includes(iconCode)) hint = "cloud partly";
  else if ([45, 48].includes(iconCode)) hint = "fog";
  else if (iconCode >= 51 && iconCode <= 67) hint = "rain drizzle";
  else if (iconCode >= 71 && iconCode <= 77) hint = "snow";
  else if (iconCode >= 80 && iconCode <= 86) hint = "rain snow showers";
  else if (iconCode >= 95 && iconCode <= 99) hint = "storm";
  
  // Using a placeholder that shows the WMO code, with a neutral background
  return `https://placehold.co/64x64.png?text=WMO:${iconCode}&bg=e0e0e0&fg=757575`;
};


export default function CurrentWeather({ data }: CurrentWeatherProps) {
  const displayValue = (value: number | undefined | null, unit: string = "", precision: number = 1) => {
    return typeof value === 'number' ? `${value.toFixed(precision)}${unit}` : 'N/A';
  };

  const displayTime = (isoString: string | undefined | null) => {
    if (!isoString) return 'N/A';
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch (e) {
      return 'N/A';
    }
  };
  
  const visibilityInKm = typeof data.visibility?.total === 'number' ? data.visibility.total / 1000 : null;

  const windSpeedDisplay = displayValue(data.wind?.speed, " m/s");
  // For display, only show gust if it's a number. Otherwise, displayValue will render it as "N/A".
  const windGustDisplay = displayValue(data.wind?.gust, " m/s");

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Current Weather</CardTitle>
            <CardDescription className="text-base">{data.summary || 'N/A'}</CardDescription>
          </div>
          {data.weather_icon_code !== undefined && (
            <Image 
              src={getWeatherIconUrl(data.weather_icon_code, data.summary)} 
              alt={data.summary || 'Weather icon'} 
              width={64} 
              height={64} 
              data-ai-hint={typeof data.weather_icon_code === 'string' ? data.summary || "weather icon" : `wmo ${data.weather_icon_code}`}
              className="rounded-md"
              unoptimized={typeof data.weather_icon_code === 'string'} // OWM icons are already optimized
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Temperature">
          <Thermometer className="text-primary" />
          <span>Temp: {displayValue(data.temp, "°C")} (Feels: {displayValue(data.feels_like, "°C")})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Wind Speed and Gusts">
          <Wind className="text-primary" />
          <span>Wind: {windSpeedDisplay} (Gusts: {windGustDisplay})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Wind Direction">
          <Navigation className="text-primary" style={{ transform: `rotate(${typeof data.wind?.angle === 'number' ? data.wind.angle : 0}deg)` }} />
          <span>Direction: {data.wind?.dir || 'N/A'} ({displayValue(data.wind?.angle, "°", 0)})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Precipitation">
          <Umbrella className="text-primary" />
          <span>Precip: {displayValue(data.precipitation?.total, " mm")} ({data.precipitation?.type || 'N/A'})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Cloud Cover">
          <Cloud className="text-primary" />
          <span>Cloud Cover: {displayValue(data.cloud_cover?.total, "%", 0)}</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Visibility">
            <Eye className="text-primary" />
            <span>Visibility: {displayValue(visibilityInKm, " km")}</span>
        </div>
        {typeof data.dew_point === 'number' && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Dew Point">
            <Droplets className="text-primary" />
            <span>Dew Point: {displayValue(data.dew_point, "°C")}</span>
          </div>
        )}
        {typeof data.pressure?.msl === 'number' && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Air Pressure">
            <Gauge className="text-primary" />
            <span>Pressure: {displayValue(data.pressure.msl, " hPa", 0)}</span>
          </div>
        )}
         {typeof data.humidity === 'number' && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Humidity">
            <Droplets className="text-primary opacity-70" /> {/* Using Droplets as a generic humidity icon */}
            <span>Humidity: {displayValue(data.humidity, "%", 0)}</span>
          </div>
        )}
        {data.sunrise && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Sunrise Time">
            <Sunrise className="text-primary" />
            <span>Sunrise: {displayTime(data.sunrise)}</span>
          </div>
        )}
        {data.sunset && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Sunset Time">
            <Sunset className="text-primary" />
            <span>Sunset: {displayTime(data.sunset)}</span>
          </div>
        )}
        {typeof data.cloud_base_height === 'number' && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" title="Cloud Base Height">
            <ArrowDownUp className="text-primary" /> {/* Using generic up/down for height */}
            <span>Cloud Base: {displayValue(data.cloud_base_height, " m", 0)}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
