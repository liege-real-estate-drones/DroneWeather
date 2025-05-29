"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DroneProfile } from "@/types";
import { SlidersHorizontal } from "lucide-react";

const customDroneParamsSchema = z.object({
  maxWindSpeed: z.coerce.number().min(0, "Must be positive").max(50, "Too high"),
  minTemp: z.coerce.number().min(-50, "Too low").max(60, "Too high"),
  maxTemp: z.coerce.number().min(-50, "Too low").max(60, "Too high"),
}).refine(data => data.maxTemp > data.minTemp, {
  message: "Max temp must be greater than min temp",
  path: ["maxTemp"],
});

type CustomDroneParamsFormData = z.infer<typeof customDroneParamsSchema>;

interface CustomDroneParamsFormProps {
  initialValues: Omit<DroneProfile, 'name'>;
  onSubmit: (data: Omit<DroneProfile, 'name'>) => void;
}

export default function CustomDroneParamsForm({ initialValues, onSubmit }: CustomDroneParamsFormProps) {
  const form = useForm<CustomDroneParamsFormData>({
    resolver: zodResolver(customDroneParamsSchema),
    defaultValues: initialValues,
  });

  const handleFormSubmit = (values: CustomDroneParamsFormData) => {
    onSubmit(values);
  };

  return (
    <Card className="mt-4 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal className="text-primary"/>
          Custom Drone Parameters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="maxWindSpeed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Wind Speed (m/s)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minTemp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Temperature (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxTemp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Temperature (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Save Custom Parameters</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
