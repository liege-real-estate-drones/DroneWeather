"use client";

import type { MeteosourceHourlyItemData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, Cloud, Umbrella } from "lucide-react";
import { format, parseISO } from 'date-fns';
import Image from "next/image";

interface HourlyWeatherCardProps {
  data: MeteosourceHourlyItemData;
}

const getWeatherIconUrl = (iconNum: number) => {
  let hint = "weather";
  if (iconNum === 1 || iconNum === 2) hint = "sun";
  if (iconNum >=3 && iconNum <= 6) hint = "cloud sun";
  if (iconNum === 7 || iconNum === 8) hint = "cloud fog";
  if (iconNum >= 10 && iconNum <= 13) hint = "cloud rain";
  if (iconNum >= 14 && iconNum <= 16) hint = "cloud snow";
  if (iconNum === 17 || iconNum === 18) hint = "storm";
  
  return `https://placehold.co/48x48.png?text=${iconNum}&bg=A0C4E2&fg=FFFFFF`; // Lighter blue background
};

export default function HourlyWeatherCard({ data }: HourlyWeatherCardProps) {
  const time = format(parseISO(data.date), 'HH:mm');

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{time}</CardTitle>
          <Image 
            src={getWeatherIconUrl(data.icon_num)} 
            alt={data.summary} 
            width={48} 
            height={48}
            data-ai-hint="weather icon small"
            className="rounded-md"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm pt-0">
        <p className="text-muted-foreground">{data.summary}</p>
        <div className="flex items-center gap-1">
          <Thermometer size={16} className="text-primary" />
          <span>{data.temp}°C</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind size={16} className="text-primary" />
          <span>{data.wind.speed} m/s (Gusts: {data.wind.gust} m/s)</span>
        </div>
         <div className="flex items-center gap-1">
          <Umbrella size={16} className="text-primary" />
          <span>{data.precipitation.type} ({data.precipitation.total}mm)</span>
        </div>
        <div className="flex items-center gap-1">
          <Cloud size={16} className="text-primary" />
          <span>Cloud: {data.cloud_cover.total}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
