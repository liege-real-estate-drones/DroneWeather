
import type { DroneProfile, Coordinates } from '@/types';

export const DJI_MINI_4_PRO_PROFILE: DroneProfile = {
  name: 'DJI Mini 4 Pro',
  maxWindSpeed: 10.7, // m/s
  minTemp: -10, // °C
  maxTemp: 40, // °C
};

export const DJI_MINI_3_PRO_PROFILE: DroneProfile = {
  name: 'DJI Mini 3 Pro',
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

export const DJI_AIR_3_PROFILE: DroneProfile = {
  name: 'DJI Air 3',
  maxWindSpeed: 12, // m/s
  minTemp: -10, // °C
  maxTemp: 40, // °C
};

export const DJI_MAVIC_3_PRO_PROFILE: DroneProfile = {
  name: 'DJI Mavic 3 Pro',
  maxWindSpeed: 12, // m/s
  minTemp: -10, // °C
  maxTemp: 40, // °C
};

export const DJI_FPV_PROFILE: DroneProfile = {
  name: 'DJI FPV',
  maxWindSpeed: 12, // approximation, level 5 winds (10.5-13.4 m/s)
  minTemp: -10, // °C
  maxTemp: 40, // °C
};


export const DEFAULT_DRONE_PROFILES: DroneProfile[] = [
  DJI_MINI_4_PRO_PROFILE,
  DJI_MINI_3_PRO_PROFILE,
  DJI_AVATA_2_PROFILE,
  DJI_AIR_3_PROFILE,
  DJI_MAVIC_3_PRO_PROFILE,
  DJI_FPV_PROFILE,
];

// Coordonnées pour Vieille ruelle 31, 4347 Roloux, Belgique
export const ROLOUX_COORDS: Coordinates = {
  lat: 50.6550,
  lng: 5.3850,
};

export const BELGIUM_CENTER: Coordinates = ROLOUX_COORDS; // Default to Roloux

export const DEFAULT_MAP_ZOOM = 16; // Zoom level for Roloux view

export const DRONE_MODELS = {
  MINI_4_PRO: DJI_MINI_4_PRO_PROFILE.name,
  MINI_3_PRO: DJI_MINI_3_PRO_PROFILE.name,
  AVATA_2: DJI_AVATA_2_PROFILE.name,
  AIR_3: DJI_AIR_3_PROFILE.name,
  MAVIC_3_PRO: DJI_MAVIC_3_PRO_PROFILE.name,
  FPV: DJI_FPV_PROFILE.name,
  CUSTOM: 'Custom',
} as const;

export const LOCAL_STORAGE_DEFAULT_LOCATION_KEY = 'droneWeatherAppDefaultLocation';
export const LOCAL_STORAGE_DEFAULT_DRONE_KEY = 'droneWeatherAppDefaultDrone';
