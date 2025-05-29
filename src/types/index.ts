export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DroneProfile {
  name: string;
  maxWindSpeed: number; // m/s
  minTemp: number; // °C
  maxTemp: number; // °C
}

export interface MeteosourceCurrentData {
  summary: string;
  icon_num: number;
  temp: number;
  feels_like: number;
  wind: {
    speed: number; // m/s
    gust: number; // m/s
    angle: number;
    dir: string;
  };
  precipitation: {
    total: number; // mm
    type: string; // "none", "rain", "snow", etc.
  };
  cloud_cover: {
    total: number; // %
    low?: number;
    middle?: number;
    high?: number;
  };
  visibility?: { // Optional as per API docs, might not always be present
    total: number; // km
  };
  dew_point?: number; // °C
  pressure?: { // Optional
    msl: number; // hPa
  };
}

export interface MeteosourceHourlyItemData extends MeteosourceCurrentData {
  date: string; // YYYY-MM-DDTHH:MM:SSZ
}

export interface MeteosourceHourlyData {
  data: MeteosourceHourlyItemData[];
}

export interface MeteosourceResponse {
  lat: string;
  lon: string;
  elevation: number;
  timezone: string;
  units: string;
  current: MeteosourceCurrentData | null;
  hourly: MeteosourceHourlyData | null;
}

export interface SafetyAssessment {
  safeToFly: boolean;
  indicatorColor: 'GREEN' | 'ORANGE' | 'RED';
  message: string;
}
