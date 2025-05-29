
"use client";

import type { UnifiedDailyForecastItemData } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, Umbrella, Calendar, Sunrise, Sunset } from "lucide-react";
import Image from "next/image";
import { format, parseISO } from 'date-fns';

interface DailyWeatherCardProps {
  data: UnifiedDailyForecastItemData;
}

const getWeatherIconUrl = (iconCode: string | number | undefined | null, summary?: string): string => {
  let hint = "weather daily";
  if (iconCode === null || typeof iconCode === 'undefined') {
    return `https://placehold.co/48x48.png?text=?&bg=A0C4E2&fg=FFFFFF`;
  }

  if (typeof iconCode === 'string') { // OpenWeatherMap icon code
    hint = summary || "weather daily";
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


export default function DailyWeatherCard({ data }: DailyWeatherCardProps) {
  const date = data.date ? format(parseISO(data.date), 'EEE, MMM d') : 'N/A';

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

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md flex items-center gap-1">
            <Calendar size={16} className="text-muted-foreground" /> {date}
          </CardTitle>
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
         <CardDescription className="text-xs text-muted-foreground truncate" title={data.summary || 'N/A'}>
            {data.summary || 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm pt-0 flex-grow">
        <div className="flex items-center gap-1" title="Temperature Range">
          <Thermometer size={16} className="text-primary" />
          <span>{displayValue(data.temp_min, "°C")} / {displayValue(data.temp_max, "°C")}</span>
        </div>
        <div className="flex items-center gap-1" title="Max Wind Speed and Gusts">
          <Wind size={16} className="text-primary" />
          <span>{displayValue(data.wind_speed_max, "m/s")} (Gusts: {displayValue(data.wind_gust_max, "m/s")})</span>
        </div>
        <div className="flex items-center gap-1" title="Precipitation">
          <Umbrella size={16} className="text-primary" />
          <span>{displayValue(data.precipitation_sum, "mm")} (Prob: {displayValue(data.precipitation_probability_max, "%", 0)})</span>
        </div>
        {data.sunrise && (
            <div className="flex items-center gap-1 text-xs" title="Sunrise">
                <Sunrise size={14} className="text-orange-400" />
                <span>{displayTime(data.sunrise)}</span>
            </div>
        )}
        {data.sunset && (
            <div className="flex items-center gap-1 text-xs" title="Sunset">
                <Sunset size={14} className="text-orange-600" />
                <span>{displayTime(data.sunset)}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
