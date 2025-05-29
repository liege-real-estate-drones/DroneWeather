"use client";

import type { MeteosourceCurrentData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Thermometer, Wind, Cloud, Eye, Droplets, Gauge, Navigation, Umbrella, Sunrise, Sunset } from "lucide-react";
import Image from "next/image";

interface CurrentWeatherProps {
  data: MeteosourceCurrentData;
}

// Map Meteosource icon numbers to textual descriptions or image paths
// For simplicity, we'll use placeholder images. In a real app, map these to actual weather icon images.
const getWeatherIconUrl = (iconNum: number) => {
  // This is a simplified mapping. Meteosource provides many icons.
  // Refer to https://www.meteosource.com/documentation/icons for actual icon mapping.
  let hint = "weather";
  if (iconNum === 1 || iconNum === 2) hint = "sun"; // Clear, Mostly sunny
  if (iconNum >=3 && iconNum <= 6) hint = "cloud sun"; // Partly cloudy, Cloudy
  if (iconNum === 7 || iconNum === 8) hint = "cloud fog"; // Fog
  if (iconNum >= 10 && iconNum <= 13) hint = "cloud rain"; // Rain
  if (iconNum >= 14 && iconNum <= 16) hint = "cloud snow"; // Snow
  if (iconNum === 17 || iconNum === 18) hint = "storm"; // Thunderstorm
  
  return `https://placehold.co/64x64.png?text=${iconNum}&bg=87CEEB&fg=FFFFFF`; // Sky blue background
};


export default function CurrentWeather({ data }: CurrentWeatherProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Current Weather</CardTitle>
            <CardDescription className="text-base">{data.summary}</CardDescription>
          </div>
          <Image 
            src={getWeatherIconUrl(data.icon_num)} 
            alt={data.summary} 
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
          <span>Temperature: {data.temp}°C (Feels like: {data.feels_like}°C)</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Wind className="text-primary" />
          <span>Wind: {data.wind.speed} m/s (Gusts: {data.wind.gust} m/s)</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Navigation className="text-primary" style={{ transform: `rotate(${data.wind.angle}deg)` }} />
          <span>Wind Direction: {data.wind.dir} ({data.wind.angle}°)</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Umbrella className="text-primary" />
          <span>Precipitation: {data.precipitation.total} mm ({data.precipitation.type})</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <Cloud className="text-primary" />
          <span>Cloud Cover: {data.cloud_cover.total}%</span>
        </div>
        {data.visibility && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Eye className="text-primary" />
            <span>Visibility: {data.visibility.total} km</span>
          </div>
        )}
        {data.dew_point !== undefined && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Droplets className="text-primary" />
            <span>Dew Point: {data.dew_point}°C</span>
          </div>
        )}
        {data.pressure && (
           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Gauge className="text-primary" />
            <span>Pressure: {data.pressure.msl} hPa</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
