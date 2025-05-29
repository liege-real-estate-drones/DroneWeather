import type { DroneProfile, Coordinates } from '@/types';

export const DJI_MINI_4_PRO_PROFILE: DroneProfile = {
  name: 'DJI Mini 4 Pro',
  maxWindSpeed: 10.7, // m/s
  minTemp: -10, // °C
  maxTemp: 40, // °C
};

export const DJI_AVATA_2_PROFILE: DroneProfile = {
  name: 'DJI Avata 2',
  maxWindSpeed: 10.7, // m/s
  minTemp: -10, // °C
  maxTemp: 40, // °C
};

export const DEFAULT_DRONE_PROFILES: DroneProfile[] = [
  DJI_MINI_4_PRO_PROFILE,
  DJI_AVATA_2_PROFILE,
];

export const BELGIUM_CENTER: Coordinates = {
  lat: 50.5039,
  lng: 4.4699,
};

export const DEFAULT_MAP_ZOOM = 8;

export const DRONE_MODELS = {
  MINI_4_PRO: 'DJI Mini 4 Pro',
  AVATA_2: 'DJI Avata 2',
  CUSTOM: 'Custom',
} as const;
