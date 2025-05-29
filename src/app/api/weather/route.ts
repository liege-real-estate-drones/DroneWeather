// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import type { 
  UnifiedWeatherResponse, 
  UnifiedCurrentWeatherData, 
  UnifiedHourlyForecastItemData,
  OpenMeteoResponse,
  OWMCurrentResponse, OWMForecastResponse
} from '@/types';

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

// Helper functions
function wmoCodeToDescription(code: number | undefined): { summary: string; precipType: string; weather_icon_code: number | null } {
  if (typeof code !== 'number') return { summary: 'Weather data unavailable', precipType: 'none', weather_icon_code: null };

  const descriptions: { [key: number]: { summary: string; precipType: string } } = {
    0: { summary: 'Clear sky', precipType: 'none' },
    1: { summary: 'Mainly clear', precipType: 'none' },
    2: { summary: 'Partly cloudy', precipType: 'none' },
    3: { summary: 'Overcast', precipType: 'none' },
    45: { summary: 'Fog', precipType: 'none' },
    48: { summary: 'Depositing rime fog', precipType: 'none' },
    51: { summary: 'Light drizzle', precipType: 'rain' },
    53: { summary: 'Moderate drizzle', precipType: 'rain' },
    55: { summary: 'Dense drizzle', precipType: 'rain' },
    56: { summary: 'Light freezing drizzle', precipType: 'rain' },
    57: { summary: 'Dense freezing drizzle', precipType: 'rain' },
    61: { summary: 'Slight rain', precipType: 'rain' },
    63: { summary: 'Moderate rain', precipType: 'rain' },
    65: { summary: 'Heavy rain', precipType: 'rain' },
    66: { summary: 'Light freezing rain', precipType: 'rain' },
    67: { summary: 'Heavy freezing rain', precipType: 'rain' },
    71: { summary: 'Slight snow fall', precipType: 'snow' },
    73: { summary: 'Moderate snow fall', precipType: 'snow' },
    75: { summary: 'Heavy snow fall', precipType: 'snow' },
    77: { summary: 'Snow grains', precipType: 'snow' },
    80: { summary: 'Slight rain showers', precipType: 'rain' },
    81: { summary: 'Moderate rain showers', precipType: 'rain' },
    82: { summary: 'Violent rain showers', precipType: 'rain' },
    85: { summary: 'Slight snow showers', precipType: 'snow' },
    86: { summary: 'Heavy snow showers', precipType: 'snow' },
    95: { summary: 'Thunderstorm', precipType: 'rain' }, // Assuming rain for thunderstorm
    96: { summary: 'Thunderstorm with slight hail', precipType: 'rain' },
    99: { summary: 'Thunderstorm with heavy hail', precipType: 'rain' },
  };
  return { ...(descriptions[code] || { summary: `Unknown WMO code ${code}`, precipType: 'other' }), weather_icon_code: code };
}

function owmToUnifiedPrecip(weather: OWMCurrentResponse | OWMForecastListItem): { total: number | null; type: string; } {
  let totalPrecip = 0;
  let precipType = 'none';

  if (weather.rain) {
    totalPrecip = weather.rain['1h'] || weather.rain['3h'] || 0;
    precipType = 'rain';
  }
  if (weather.snow) {
    totalPrecip = (weather.snow['1h'] || weather.snow['3h'] || 0); // Assuming snow overrides rain if both present
    precipType = 'snow';
  }
  
  // OWM weather array can give more specific types
  if (weather.weather && weather.weather.length > 0) {
    const mainWeather = weather.weather[0].main.toLowerCase();
    if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) precipType = 'rain';
    else if (mainWeather.includes('snow')) precipType = 'snow';
    else if (mainWeather.includes('thunderstorm')) precipType = 'rain'; // Or 'other'
    // other conditions like 'clear', 'clouds', 'fog', 'mist' map to 'none' or 'other'
  }

  return { total: totalPrecip > 0 ? totalPrecip : null, type: precipType };
}

function degreesToCardinal(deg: number | null | undefined): string | null {
  if (typeof deg !== 'number') return null;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.floor((deg + 11.25) / 22.5) % 16];
}


async function fetchOpenMeteoData(lat: string, lon: string): Promise<UnifiedWeatherResponse | null> {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m,cloud_base_height',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,cloud_base_height',
    daily: 'weather_code,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '1', // For hourly, get 24 hours. Open-Meteo gives up to 16 days for free on hourly. We only need 1 day of hourly.
  });
  const url = `https://api.open-meteo.com/v1/metno?${params.toString()}`; // Using MET Norway model via Open-Meteo

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status}`, await response.text());
      return null;
    }
    const data = await response.json() as OpenMeteoResponse;

    let currentData: UnifiedCurrentWeatherData | null = null;
    if (data.current && data.current_units) {
      const wmoInfo = wmoCodeToDescription(data.current.weather_code);
      currentData = {
        summary: wmoInfo.summary,
        weather_icon_code: wmoInfo.weather_icon_code,
        temp: data.current.temperature_2m ?? null,
        feels_like: data.current.apparent_temperature ?? null,
        wind: {
          speed: data.current.wind_speed_10m ?? null,
          gust: data.current.wind_gusts_10m ?? null,
          angle: data.current.wind_direction_10m ?? null,
          dir: degreesToCardinal(data.current.wind_direction_10m),
        },
        precipitation: {
          total: data.current.precipitation ?? null,
          type: wmoInfo.precipType,
        },
        cloud_cover: { total: data.current.cloud_cover ?? null },
        visibility: { total: data.current.visibility ?? null }, // in meters
        dew_point: data.current.dew_point_2m ?? null,
        pressure: { msl: data.current.pressure_msl ?? null },
        humidity: data.current.relative_humidity_2m ?? null,
        sunrise: data.daily?.sunrise?.[0] ?? null,
        sunset: data.daily?.sunset?.[0] ?? null,
        cloud_base_height: data.current.cloud_base_height ?? null,
      };
    }

    let hourlyDataItems: UnifiedHourlyForecastItemData[] = [];
    if (data.hourly && data.hourly_units && data.hourly.time) {
       // Take first 24 entries if more are returned
      const numEntries = Math.min(data.hourly.time.length, 24);
      for (let i = 0; i < numEntries; i++) {
        const wmoInfo = wmoCodeToDescription(data.hourly.weather_code?.[i]);
        hourlyDataItems.push({
          date: data.hourly.time[i],
          summary: wmoInfo.summary,
          weather_icon_code: wmoInfo.weather_icon_code,
          temp: data.hourly.temperature_2m?.[i] ?? null,
          feels_like: data.hourly.apparent_temperature?.[i] ?? null,
          wind: {
            speed: data.hourly.wind_speed_10m?.[i] ?? null,
            gust: data.hourly.wind_gusts_10m?.[i] ?? null,
            angle: data.hourly.wind_direction_10m?.[i] ?? null,
            dir: degreesToCardinal(data.hourly.wind_direction_10m?.[i]),
          },
          precipitation: {
            total: data.hourly.precipitation?.[i] ?? null,
            type: wmoInfo.precipType,
          },
          precipitation_probability: data.hourly.precipitation_probability?.[i] ?? null,
          cloud_cover: { total: data.hourly.cloud_cover?.[i] ?? null },
          visibility: { total: data.hourly.visibility?.[i] ?? null }, // in meters
          dew_point: data.hourly.dew_point_2m?.[i] ?? null,
          humidity: data.hourly.relative_humidity_2m?.[i] ?? null,
          cloud_base_height: data.hourly.cloud_base_height?.[i] ?? null,
        });
      }
    }
    
    return {
      lat,
      lon,
      elevation: data.elevation ?? null,
      timezone: data.timezone ?? null,
      units: 'metric', // Open-Meteo defaults to metric
      current: currentData,
      hourly: hourlyDataItems.length > 0 ? { data: hourlyDataItems } : null,
    };

  } catch (error) {
    console.error('Failed to fetch or process Open-Meteo data:', error);
    return null;
  }
}


async function fetchOpenWeatherData(lat: string, lon: string): Promise<UnifiedWeatherResponse | null> {
  if (!OPENWEATHERMAP_API_KEY) {
    console.error('OpenWeatherMap API key is not configured.');
    return null;
  }
  try {
    // Fetch current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=en`;
    const currentResponse = await fetch(currentUrl);
    if (!currentResponse.ok) {
      console.error(`OWM Current API error: ${currentResponse.status}`, await currentResponse.text());
      return null;
    }
    const currentOWMData = await currentResponse.json() as OWMCurrentResponse;

    let currentData: UnifiedCurrentWeatherData | null = null;
    if (currentOWMData && currentOWMData.weather && currentOWMData.weather.length > 0) {
      const precipInfo = owmToUnifiedPrecip(currentOWMData);
      currentData = {
        summary: currentOWMData.weather[0].description,
        weather_icon_code: currentOWMData.weather[0].icon,
        temp: currentOWMData.main?.temp ?? null,
        feels_like: currentOWMData.main?.feels_like ?? null,
        wind: {
          speed: currentOWMData.wind?.speed ?? null,
          gust: currentOWMData.wind?.gust ?? null,
          angle: currentOWMData.wind?.deg ?? null,
          dir: degreesToCardinal(currentOWMData.wind?.deg),
        },
        precipitation: {
          total: precipInfo.total,
          type: precipInfo.type,
        },
        cloud_cover: { total: currentOWMData.clouds?.all ?? null },
        visibility: { total: currentOWMData.visibility ?? null }, // in meters
        dew_point: null, // OWM doesn't directly provide dew point in free current weather. Calculation needed.
        pressure: { msl: currentOWMData.main?.pressure ?? null }, // OWM provides surface pressure, not always MSL.
        humidity: currentOWMData.main?.humidity ?? null,
        sunrise: currentOWMData.sys?.sunrise ? new Date(currentOWMData.sys.sunrise * 1000).toISOString() : null,
        sunset: currentOWMData.sys?.sunset ? new Date(currentOWMData.sys.sunset * 1000).toISOString() : null,
        cloud_base_height: null, // Not typically available in OWM free current
      };
    }
    
    // Fetch hourly forecast (5 day / 3 hour forecast)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=en`;
    const forecastResponse = await fetch(forecastUrl);
     if (!forecastResponse.ok) {
      console.error(`OWM Forecast API error: ${forecastResponse.status}`, await forecastResponse.text());
      // Return current data if forecast fails but current succeeded
      return {
        lat, lon, elevation: null, timezone: currentOWMData.timezone ? (currentOWMData.timezone / 3600).toString() + ' UTC' : null, units: 'metric',
        current: currentData, hourly: null,
      };
    }
    const forecastOWMData = await forecastResponse.json() as OWMForecastResponse;
    
    let hourlyDataItems: UnifiedHourlyForecastItemData[] = [];
    if (forecastOWMData && forecastOWMData.list) {
      // OWM provides 3-hourly data. We need up to 24 hours, so 8 entries.
      const entriesToTake = Math.min(forecastOWMData.list.length, 8); 
      for (let i = 0; i < entriesToTake; i++) {
        const item = forecastOWMData.list[i];
        const precipInfo = owmToUnifiedPrecip(item);
        hourlyDataItems.push({
          date: item.dt_txt.replace(' ', 'T') + 'Z', // Approximate to ISO, OWM dt_txt is UTC
          summary: item.weather[0].description,
          weather_icon_code: item.weather[0].icon,
          temp: item.main?.temp ?? null,
          feels_like: item.main?.feels_like ?? null,
          wind: {
            speed: item.wind?.speed ?? null,
            gust: item.wind?.gust ?? null, // Might not always be there
            angle: item.wind?.deg ?? null,
            dir: degreesToCardinal(item.wind?.deg),
          },
          precipitation: {
            total: precipInfo.total,
            type: precipInfo.type,
          },
          precipitation_probability: item.pop ? item.pop * 100 : null, // OWM pop is 0-1
          cloud_cover: { total: item.clouds?.all ?? null },
          visibility: { total: item.visibility ?? null }, // in meters
          dew_point: null,
          humidity: item.main?.humidity ?? null,
          cloud_base_height: null,
        });
      }
    }

    return {
      lat,
      lon,
      elevation: null, // OWM doesn't provide elevation directly in these calls
      timezone: currentOWMData.timezone ? (currentOWMData.timezone / 3600).toString() + ' UTC' : null, // OWM timezone is offset in seconds
      units: 'metric',
      current: currentData,
      hourly: hourlyDataItems.length > 0 ? { data: hourlyDataItems } : null,
    };

  } catch (error) {
    console.error('Failed to fetch or process OpenWeatherMap data:', error);
    return null;
  }
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Les coordonnées de latitude et longitude sont requises.' }, { status: 400 });
  }
  
  // Validate coordinates
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);
  if (isNaN(numLat) || isNaN(numLon) || numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) {
    return NextResponse.json({ error: 'Coordonnées invalides.' }, { status: 400 });
  }

  let weatherData: UnifiedWeatherResponse | null = null;

  // Try Open-Meteo first
  console.log("Attempting to fetch from Open-Meteo...");
  weatherData = await fetchOpenMeteoData(lat, lon);

  // If Open-Meteo fails, try OpenWeatherMap
  if (!weatherData || !weatherData.current || !weatherData.hourly) {
    console.warn("Open-Meteo fetch failed or returned incomplete data, trying OpenWeatherMap...");
    if (!OPENWEATHERMAP_API_KEY) {
        console.error('OpenWeatherMap API key is not configured. Cannot use as fallback.');
        return NextResponse.json({ error: 'Service météo principal indisponible et service de secours non configuré.' }, { status: 503 });
    }
    weatherData = await fetchOpenWeatherData(lat, lon);
  }

  if (!weatherData) {
    return NextResponse.json({ error: 'Échec de la récupération des données météo depuis toutes les sources.' }, { status: 500 });
  }
  
  if (!weatherData.current && !weatherData.hourly) {
     return NextResponse.json({ error: 'Aucune donnée météo actuelle ou prévisionnelle disponible pour ce lieu.' }, { status: 404 });
  }

  return NextResponse.json(weatherData);
}
