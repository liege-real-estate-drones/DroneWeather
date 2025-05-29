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
  prompt: `You are an expert in drone safety.

  Given the current weather conditions and the drone's safety parameters, determine if it is safe to fly the drone.

  Current Weather Conditions:
  - Temperature: {{{temperature}}} Celsius
  - Wind Speed: {{{windSpeed}}} m/s
  - Wind Gust: {{{windGust}}} m/s
  - Precipitation: {{{precipitationType}}}

  Drone Safety Parameters:
  - Max Wind Speed: {{{maxWindSpeed}}} m/s
  - Min Temperature: {{{minTemperature}}} Celsius
  - Max Temperature: {{{maxTemperature}}} Celsius

  Consider these factors to determine if it is safe to fly. If the wind speed or gust exceeds the maximum wind speed, or if the temperature is outside the allowed range, or if there is precipitation, it is not safe to fly.

  Output a JSON object with the following fields:
  - safeToFly (boolean): true if it is safe to fly, false otherwise.
  - indicatorColor (string): "GREEN" if safe, "ORANGE" if conditions are marginal, and "RED" if not safe.
  - message (string): A short message indicating the safety status and reasons.
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
