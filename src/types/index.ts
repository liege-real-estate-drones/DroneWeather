
// src/types/index.ts

export interface MeteosourceErrorDetailItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface MeteosourceErrorResponse {
  error?: string;
  message?: string;
  detail?: string | MeteosourceErrorDetailItem[];
}

// Types de données unifiés pour la météo, adaptés des anciens types Meteosource
export interface UnifiedCurrentWeatherData {
  summary: string;
  weather_icon_code: string | number | null; // OWM string code, WMO number, or null
  temp: number | null;
  feels_like: number | null;
  wind: {
    speed: number | null; // m/s
    gust: number | null; // m/s
    angle: number | null;
    dir: string | null;
  };
  precipitation: {
    total: number | null; // mm
    type: string; // "none", "rain", "snow", "other"
  };
  cloud_cover: {
    total: number | null; // %
  };
  visibility: { // En mètres
    total: number | null;
  };
  dew_point?: number | null; // °C
  pressure?: {
    msl: number | null; // hPa
  };
  humidity?: number | null; // %
  sunrise?: string | null; // ISO string
  sunset?: string | null;  // ISO string
  cloud_base_height?: number | null; // mètres
}

export interface UnifiedHourlyForecastItemData extends Omit<UnifiedCurrentWeatherData, 'sunrise' | 'sunset'> {
  date: string; // YYYY-MM-DDTHH:MM:SSZ ou format similaire
  precipitation_probability?: number | null; // %
}

export interface UnifiedDailyForecastItemData {
  date: string; // YYYY-MM-DD
  summary: string | null;
  weather_icon_code: string | number | null;
  temp_min: number | null;
  temp_max: number | null;
  wind_speed_max: number | null; // m/s
  wind_gust_max: number | null; // m/s
  precipitation_sum: number | null; // mm
  precipitation_probability_max: number | null; // %
  sunrise?: string | null; // ISO string
  sunset?: string | null;  // ISO string
}


export interface UnifiedWeatherResponse {
  lat: string;
  lon: string;
  elevation: number | null;
  timezone: string | null;
  units: string;
  current: UnifiedCurrentWeatherData | null;
  hourly: {
    data: UnifiedHourlyForecastItemData[];
  } | null;
  daily: {
    data: UnifiedDailyForecastItemData[];
  };
}

// Types spécifiques pour les réponses brutes des API
// Open-Meteo
export interface OpenMeteoCurrent {
  time: string;
  interval: number;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  apparent_temperature?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  weather_code?: number;
  cloud_cover?: number;
  pressure_msl?: number;
  surface_pressure?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  wind_gusts_10m?: number;
  visibility?: number;
  dew_point_2m?: number;
  cloud_base_height?: number;
}

export interface OpenMeteoHourlyUnits {
  [key: string]: string;
}
export interface OpenMeteoHourly {
  time: string[];
  temperature_2m?: number[];
  relative_humidity_2m?: number[];
  apparent_temperature?: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
  rain?: number[];
  showers?: number[];
  snowfall?: number[];
  weather_code?: number[];
  cloud_cover?: number[];
  visibility?: number[];
  wind_speed_10m?: number[];
  wind_direction_10m?: number[];
  wind_gusts_10m?: number[];
  dew_point_2m?: number[];
  cloud_base_height?: number[];
}

export interface OpenMeteoDailyUnits {
    [key: string]: string;
}
export interface OpenMeteoDaily {
    time: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units?: OpenMeteoHourlyUnits;
  current?: OpenMeteoCurrent;
  hourly_units?: OpenMeteoHourlyUnits;
  hourly?: OpenMeteoHourly;
  daily_units?: OpenMeteoDailyUnits;
  daily?: OpenMeteoDaily;
}

// OpenWeatherMap
export interface OWMWeather {
  id: number;
  main: string;
  description: string;
  icon: string;
}
export interface OWMMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
}
export interface OWMWind {
  speed: number;
  deg: number;
  gust?: number;
}
export interface OWMClouds {
  all: number;
}
export interface OWMRain {
  '1h'?: number;
  '3h'?: number;
}
export interface OWMSnow {
  '1h'?: number;
  '3h'?: number;
}
export interface OWMSys {
  type?: number;
  id?: number;
  country?: string;
  sunrise: number; // timestamp
  sunset: number;  // timestamp
}
export interface OWMCurrentResponse {
  coord: { lon: number; lat: number };
  weather: OWMWeather[];
  base: string;
  main: OWMMain;
  visibility: number; // meters
  wind: OWMWind;
  clouds: OWMClouds;
  rain?: OWMRain;
  snow?: OWMSnow;
  dt: number; // timestamp
  sys: OWMSys;
  timezone: number; // Shift in seconds from UTC
  id: number;
  name: string;
  cod: number;
}

export interface OWMForecastListItem {
  dt: number;
  main: OWMMain & { temp_kf?: number };
  weather: OWMWeather[];
  clouds: OWMClouds;
  wind: OWMWind;
  visibility: number;
  pop: number; // Probability of precipitation
  rain?: OWMRain;
  snow?: OWMSnow;
  sys: { pod: string }; // Part of day (d or n)
  dt_txt: string; // "YYYY-MM-DD HH:MM:SS"
}
export interface OWMForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: OWMForecastListItem[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}


export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DroneProfile {
  name: string;
  maxWindSpeed: number; // m/s
  minTemp: number; // °C
  maxTemp: number; // °C;
  notes?: string;
}

export interface SafetyAssessment {
  safeToFly: boolean;
  indicatorColor: 'GREEN' | 'ORANGE' | 'RED';
  message: string;
}

// Types pour ArcGIS UAV Zones
export interface ArcGISFeatureProperties {
  OBJECTID?: number;
  GlobalID?: string; // Ajouté
  name?: string | null;
  categoryType?: string | null;
  priority?: string | null; // Ajouté
  ParentID?: string | null; // Important pour le lien avec les règles de temps si uidAmsl n'est pas directement sur cette couche.
  code?: string | null; // Ajouté
  status?: string | null;
  // centerpoint, range, latitude, longitude sont des strings, pourraient être utiles
  lowerAltitudeReference?: string | null;
  upperAltitudeReference?: string | null;
  lowerAltitudeUnit?: string | null; // Ajouté
  upperAltitudeUnit?: string | null; // Ajouté
  lowerLimit?: number | null;      // CHANGÉ: esriFieldTypeDouble, nullable: true
  upperLimit?: number | null;      // CHANGÉ: esriFieldTypeDouble, nullable: true
  reason?: string | null;
  restriction?: string | null;
  OtherReasonInfo?: string | null; // Ajouté
  extendedProperties?: string | null; // Ajouté
  last_version?: string | null; // Ajouté
  additionalInfo?: string | null; // (alias: Remarks)
  categories?: string | null; // Ajouté
  // uidAmsl?: string; // Ce champ est-il directement dans Geozone_Prod ou est-ce ParentID/OBJECTID qui sert de lien ?
                       // Votre code isZoneActive utilise: zoneFeature.properties?.uidAmsl || zoneFeature.properties?.OBJECTID?.toString()
                       // Assurez-vous que le champ utilisé pour lier aux ParentID/childID des règles de temps est bien présent et correct.
  // Le champ 'type' que vous aviez avant n'est pas listé, il correspond peut-être à 'categoryType'.
  [key: string]: any;
}

export interface GeneralTimeProperties {
  ParentID?: string;
  childID?: string;
  permanent?: string; // "1" or "0"
  startDateTime?: number; // Timestamp
  endDateTime?: number; // Timestamp
  status?: string; // Expected to be "validated"
  name?: string;
  [key: string]: any;
}

export interface SpecificTimeProperties {
  OBJECTID?: number;
  GlobalID?: string;
  ParentID?: string | null;
  childID?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  TimeUnit?: string | null; // Par ex. "DAY", "HR", ou null
  last_version?: string | null; // La viewDefinitionQuery utilise (last_version = 'yes')
  days?: string | null;
  status?: string | null;
  sunrise?: string | null;
  sunset?: string | null;
  writtenStartTime?: string | null;
  writtenEndTime?: string | null;
  name?: string | null;
  // ... autres champs si nécessaire ...
}
