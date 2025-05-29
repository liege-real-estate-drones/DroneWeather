
"use client";

import type { UnifiedDailyForecastItemData } from "@/types";
import DailyWeatherCard from "@/components/DailyWeatherCard"; // Using alias
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CalendarDays } from "lucide-react";

interface DailyForecastListProps {
  data: UnifiedDailyForecastItemData[];
}

export default function DailyForecastList({ data }: DailyForecastListProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground mt-4">No daily forecast data available.</p>;
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <CalendarDays className="text-primary" />
          Daily Forecast (Next {data.length} Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4 pb-4">
            {data.map((item) => (
              <div key={item.date} className="min-w-[220px] max-w-[250px]">
                <DailyWeatherCard data={item} />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
