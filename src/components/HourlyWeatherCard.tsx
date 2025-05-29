
"use client";

import type { UnifiedHourlyForecastItemData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, Cloud, Umbrella, Percent, Eye, Droplets, ArrowDownUp } from "lucide-react";
import { format, parseISO } from 'date-fns';
import Image from "next/image";

interface HourlyWeatherCardProps {
  data: UnifiedHourlyForecastItemData;
}

const getWeatherIconUrl = (iconCode: string | number | undefined | null, summary?: string): string => {
  let hint = "weather"; // Default hint
  if (iconCode === null || typeof iconCode === 'undefined') {
    return `https://placehold.co/48x48.png?text=?&bg=A0C4E2&fg=FFFFFF`;
  }

  if (typeof iconCode === 'string') { // OpenWeatherMap icon code
    hint = summary || "weather";
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
  
  return `https://placehold.co/48x48.png?text=WMO:${iconCode}&bg=A0C4E2&fg=FFFFFF`; 
};

export default function HourlyWeatherCard({ data }: HourlyWeatherCardProps) {
  const time = data.date ? format(parseISO(data.date), 'HH:mm') : 'N/A';

  const displayValue = (value: number | undefined | null, unit: string = "", precision: number = 1) => {
    return typeof value === 'number' ? `${value.toFixed(precision)}${unit}` : 'N/A';
  };

  const visibilityInKm = typeof data.visibility?.total === 'number' ? data.visibility.total / 1000 : null;

  const windSpeedDisplay = displayValue(data.wind?.speed, "m/s");
  let gustValueForDisplay: number | null = null;
  if (typeof data.wind?.gust === 'number') {
    gustValueForDisplay = data.wind.gust;
  } else if (typeof data.wind?.speed === 'number') { // Fallback if gust is null/undefined but speed is available
    gustValueForDisplay = data.wind.speed;
  }
  const windGustDisplay = displayValue(gustValueForDisplay, "m/s");


  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{time}</CardTitle>
          {data.weather_icon_code !== undefined && (
            <Image 
              src={getWeatherIconUrl(data.weather_icon_code, data.summary)} 
              alt={data.summary || 'Weather icon'} 
              width={48} 
              height={48}
              data-ai-hint={typeof data.weather_icon_code === 'string' ? data.summary || "weather icon small" : `wmo small ${data.weather_icon_code}`}
              className="rounded-md"
              unoptimized={typeof data.weather_icon_code === 'string'} // OWM icons are already optimized
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm pt-0 flex-grow">
        <p className="text-muted-foreground truncate" title={data.summary || 'N/A'}>{data.summary || 'N/A'}</p>
        <div className="flex items-center gap-1" title="Temperature">
          <Thermometer size={16} className="text-primary" />
          <span>{displayValue(data.temp, "°C")} (Feels: {displayValue(data.feels_like, "°C")})</span>
        </div>
        <div className="flex items-center gap-1" title="Wind Speed and Gusts">
          <Wind size={16} className="text-primary" />
          <span>{windSpeedDisplay} (Gusts: {windGustDisplay})</span>
        </div>
         <div className="flex items-center gap-1" title="Precipitation">
          <Umbrella size={16} className="text-primary" />
          <span>{data.precipitation?.type || 'N/A'} ({displayValue(data.precipitation?.total,"mm")})</span>
        </div>
        {typeof data.precipitation_probability === 'number' && (
            <div className="flex items-center gap-1" title="Precipitation Probability">
                <Percent size={16} className="text-primary" />
                <span>Precip Prob: {displayValue(data.precipitation_probability, "%", 0)}</span>
            </div>
        )}
        <div className="flex items-center gap-1" title="Cloud Cover">
          <Cloud size={16} className="text-primary" />
          <span>Cloud: {displayValue(data.cloud_cover?.total, "%", 0)}</span>
        </div>
        {typeof data.visibility?.total === 'number' && (
            <div className="flex items-center gap-1" title="Visibility">
                <Eye size={16} className="text-primary" />
                <span>Visibility: {displayValue(visibilityInKm, " km")}</span>
            </div>
        )}
        {typeof data.humidity === 'number' && (
           <div className="flex items-center gap-1" title="Humidity">
            <Droplets size={16} className="text-primary opacity-70" />
            <span>Humidity: {displayValue(data.humidity, "%", 0)}</span>
          </div>
        )}
        {typeof data.cloud_base_height === 'number' && (
            <div className="flex items-center gap-1" title="Cloud Base Height">
            <ArrowDownUp size={16} className="text-primary" />
            <span>Cloud Base: {displayValue(data.cloud_base_height, " m", 0)}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
