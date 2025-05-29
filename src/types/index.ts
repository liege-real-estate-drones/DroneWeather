// src/types/index.ts

// ... (vos autres types existants)

export interface MeteosourceErrorDetailItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface MeteosourceErrorResponse {
  error?: string; // Message d'erreur principal
  message?: string; // Parfois utilisé à la place de 'error'
  detail?: string | MeteosourceErrorDetailItem[]; // Peut être une chaîne ou un tableau de détails d'erreur
}

// Assurez-vous que MeteosourceResponse est bien défini
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
  visibility?: {
    total: number; // km
  };
  dew_point?: number; // °C
  pressure?: {
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
  // Potentiellement, ajoutez ici les champs d'erreur si l'API peut retourner
  // des erreurs même avec un statut 200 pour certains plans/cas.
  // Cependant, les erreurs 4xx/5xx sont généralement gérées par la non-ok response.
}

// ... (vos autres types existants comme Coordinates, DroneProfile, SafetyAssessment)
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

export interface SafetyAssessment {
  safeToFly: boolean;
  indicatorColor: 'GREEN' | 'ORANGE' | 'RED';
  message: string;
}
