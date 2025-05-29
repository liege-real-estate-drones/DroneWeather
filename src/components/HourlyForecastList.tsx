"use client";

import type { MeteosourceHourlyItemData } from "@/types";
import HourlyWeatherCard from "./HourlyWeatherCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Clock } from "lucide-react";

interface HourlyForecastListProps {
  data: MeteosourceHourlyItemData[];
}

export default function HourlyForecastList({ data }: HourlyForecastListProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground mt-4">No hourly forecast data available.</p>;
  }

  // Display next 12-24 hours. Meteosource free plan gives more, let's cap at 24.
  const forecastToShow = data.slice(0, 24);

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Clock className="text-primary" />
          Hourly Forecast (Next {forecastToShow.length} Hours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4 pb-4">
            {forecastToShow.map((item) => (
              <div key={item.date} className="min-w-[200px] max-w-[220px]">
                <HourlyWeatherCard data={item} />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
