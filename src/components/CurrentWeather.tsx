
"use client";

import type { MeteosourceCurrentData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Thermometer, Wind, Cloud, Eye, Droplets, Gauge, Navigation, Umbrella } from "lucide-react";
import Image from "next/image";

interface CurrentWeatherProps {
  data: MeteosourceCurrentData;
}

const getWeatherIconUrl = (iconNum: number | undefined) => {
  let hint = "weather";
  if (typeof iconNum !== 'number') {
    return `https://placehold.co/64x64.png?text=?&bg=87CEEB&fg=FFFFFF`; // Placeholder for unknown icon
  }
  if (iconNum === 1 || iconNum === 2) hint = "sun"; // Clear, Mostly sunny
  if (iconNum >=3 && iconNum <= 6) hint = "cloud sun"; // Partly cloudy, Cloudy
  if (iconNum === 7 || iconNum === 8) hint = "cloud fog"; // Fog
  if (iconNum >= 10 && iconNum <= 13) hint = "cloud rain"; // Rain
  if (iconNum >= 14 && iconNum <= 16) hint = "cloud snow"; // Snow
  if (iconNum === 17 || iconNum === 18) hint = "storm"; // Thunderstorm
  
  return `https://placehold.co/64x64.png?text=${iconNum}&bg=87CEEB&fg=FFFFFF`;
};


export default function CurrentWeather({ data }: CurrentWeatherProps) {
  const displayValue = (value: number | undefined | null, unit: string = "") => {
    return typeof value === 'number' ? `${value}${unit}` : 'N/A';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Current Weather</CardTitle>
            <CardDescription className="text-base">{data.summary || 'N/A'}</CardDescription>
          </div>
          <Image 
            src={getWeatherIconUrl(data.icon_num)} 
            alt={data.summary || 'Weather icon'} 
            width={64} 
            height={64} 
            data-ai-hint="weather icon"
            className="rounded-md"
          />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Thermometer className="text-primary" />
          <span>Temp: {displayValue(data.temp, "°C")} (Feels: {displayValue(data.feels_like, "°C")})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Wind className="text-primary" />
          <span>Wind: {displayValue(data.wind?.speed, " m/s")} (Gusts: {displayValue(data.wind?.gust, " m/s")})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Navigation className="text-primary" style={{ transform: `rotate(${typeof data.wind?.angle === 'number' ? data.wind.angle : 0}deg)` }} />
          <span>Direction: {data.wind?.dir || 'N/A'} ({displayValue(data.wind?.angle, "°")})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Umbrella className="text-primary" />
          <span>Precip: {displayValue(data.precipitation?.total, " mm")} ({data.precipitation?.type || 'N/A'})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Cloud className="text-primary" />
          <span>Cloud Cover: {displayValue(data.cloud_cover?.total, "%")}</span>
        </div>
        {data.visibility && ( // visibility might be optional itself
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Eye className="text-primary" />
            <span>Visibility: {displayValue(data.visibility.total, " km")}</span>
          </div>
        )}
        {/* Check for undefined explicitly as 0 is a valid dew_point */}
        {typeof data.dew_point !== 'undefined' && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Droplets className="text-primary" />
            <span>Dew Point: {displayValue(data.dew_point, "°C")}</span>
          </div>
        )}
        {data.pressure && ( // pressure might be optional
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Gauge className="text-primary" />
            <span>Pressure: {displayValue(data.pressure.msl, " hPa")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
