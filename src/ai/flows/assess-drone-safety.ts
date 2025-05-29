// AssessDroneSafety flow added, implementing safety assessment based on weather conditions.

'use server';

/**
 * @fileOverview Assesses drone safety based on weather conditions and drone parameters.
 *
 * - assessDroneSafety - A function that assesses drone safety.
 * - AssessDroneSafetyInput - The input type for the assessDroneSafety function.
 * - AssessDroneSafetyOutput - The return type for the assessDroneSafety function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessDroneSafetyInputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  windSpeed: z.number().describe('The current wind speed in meters per second.'),
  windGust: z.number().describe('The current wind gust in meters per second.'),
  precipitationType: z
    .string()
    .describe(
      'The type of precipitation, can be none, rain, snow, or other types of precipitation.'
    ),
  maxWindSpeed: z
    .number()
    .describe('The maximum allowed wind speed for the drone in meters per second.'),
  minTemperature: z.number().describe('The minimum allowed temperature for the drone in Celsius.'),
  maxTemperature: z.number().describe('The maximum allowed temperature for the drone in Celsius.'),
  cloudCover: z.number().describe('Cloud cover percentage (0-100).'),
  visibility: z.number().describe('Horizontal visibility in meters.'),
  cloudBaseHeight: z.number().optional().nullable().describe('Cloud base height in meters above ground, if available.'),
});
export type AssessDroneSafetyInput = z.infer<typeof AssessDroneSafetyInputSchema>;

const AssessDroneSafetyOutputSchema = z.object({
  safeToFly: z.boolean().describe('Whether it is safe to fly the drone based on the conditions.'),
  indicatorColor: z
    .enum(['GREEN', 'ORANGE', 'RED'])
    .describe('The safety indicator color: GREEN, ORANGE, or RED.'),
  message: z.string().describe('A message indicating the safety status and reasons.'),
});
export type AssessDroneSafetyOutput = z.infer<typeof AssessDroneSafetyOutputSchema>;

export async function assessDroneSafety(input: AssessDroneSafetyInput): Promise<AssessDroneSafetyOutput> {
  return assessDroneSafetyFlow(input);
}

const assessDroneSafetyPrompt = ai.definePrompt({
  name: 'assessDroneSafetyPrompt',
  input: {schema: AssessDroneSafetyInputSchema},
  output: {schema: AssessDroneSafetyOutputSchema},
  prompt: `You are an expert in drone safety for recreational drone flights in open category.

  Given the current weather conditions and the drone's safety parameters, determine if it is safe to fly the drone.

  Current Weather Conditions:
  - Temperature: {{{temperature}}} Celsius
  - Wind Speed: {{{windSpeed}}} m/s
  - Wind Gust: {{{windGust}}} m/s
  - Precipitation: {{{precipitationType}}}
  - Cloud Cover: {{{cloudCover}}}%
  - Visibility: {{{visibility}}} meters
  {{#if cloudBaseHeight}}- Cloud Base Height: {{{cloudBaseHeight}}} meters{{/if}}

  Drone Safety Parameters:
  - Max Wind Speed: {{{maxWindSpeed}}} m/s (This is the drone's limit for mean wind speed. Gusts should ideally not exceed this by much, e.g., max 1.5x this value or an absolute max like 12-15 m/s for typical recreational drones).
  - Min Temperature: {{{minTemperature}}} Celsius
  - Max Temperature: {{{maxTemperature}}} Celsius

  General Flight Rules to Consider:
  - Precipitation: Any rain or snow ({{{precipitationType}}} is not 'none') generally makes it unsafe.
  - Wind: If wind speed or wind gust exceeds the drone's {{{maxWindSpeed}}} (or gusts are significantly higher, e.g., > 12 m/s), it is unsafe.
  - Temperature: If current temperature {{{temperature}}} is outside the drone's range [{{{minTemperature}}}, {{{maxTemperature}}}], it is unsafe. Temperatures below 0°C can severely impact battery performance.
  - Visibility: Horizontal visibility should be at least 2000 meters (2 km) for VLOS (Visual Line of Sight). If {{{visibility}}} < 2000, it is unsafe.
  - Cloud Ceiling: If there is fog (implied by low visibility) or if the cloud base height is too low (e.g., {{{cloudBaseHeight}}} is available and < 120-150 meters), it is unsafe. High cloud cover ({{{cloudCover}}} > 80-90%) with low clouds can also be risky.

  Decision guide for indicatorColor:
  - GREEN: All conditions are well within safe limits.
  - ORANGE: Conditions are marginal (e.g., wind near limits, visibility just at 2km, temperature near 0°C but within drone spec). Advise caution.
  - RED: One or more critical safety limits are breached.

  Output a JSON object with the following fields:
  - safeToFly (boolean): true if it is safe to fly, false otherwise.
  - indicatorColor (string): "GREEN", "ORANGE", or "RED".
  - message (string): A short message (max 2-3 sentences) indicating the safety status and key reasons. Be specific about which parameter(s) are causing concern if not GREEN.
`,
});

const assessDroneSafetyFlow = ai.defineFlow(
  {
    name: 'assessDroneSafetyFlow',
    inputSchema: AssessDroneSafetyInputSchema,
    outputSchema: AssessDroneSafetyOutputSchema,
  },
  async input => {
    const {output} = await assessDroneSafetyPrompt(input);
    return output!;
  }
);
