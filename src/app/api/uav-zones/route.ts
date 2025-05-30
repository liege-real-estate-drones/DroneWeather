
// src/app/api/uav-zones/route.ts
import { NextResponse } from 'next/server';
import type { Feature as GeoJSONFeature, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';
import { parseISO, isWithinInterval, getDay } from 'date-fns';
import type { GeneralTimeProperties, SpecificTimeProperties } from '@/types';

const GEOMETRY_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/0';
const SPECIFIC_TIME_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Specific_Time_Download_Prod/FeatureServer/0';
const GENERAL_TIME_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/General_Time_Download_Prod/FeatureServer/0';

// Helper pour convertir les jours textuels en numéros (0=Dimanche, 6=Samedi)
const dayStringToNumber = (dayStr: string): number => {
  const map: { [key: string]: number } = {
    SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  };
  return map[dayStr.toUpperCase()] ?? -1;
};

async function fetchArcGisFeatures(url: string, params: URLSearchParams): Promise<GeoJSONFeature[]> {
  const response = await fetch(`${url}/query?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.text();
    console.error(`ArcGIS API Error (${url}):`, response.status, errorData);
    throw new Error(`Failed to fetch features from ${url}: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  // ArcGIS services can return features in `features` or directly as an array if GeoJSON is requested
  // and the `features` property is how GeoJSON standard structures it.
  // The "time" services might wrap their attributes differently.
  // Let's assume for "time" services, properties are nested under `attributes`.
  if (url.includes('Time_Download_Prod')) {
    return (data.features || []).map((f: any) => ({ type: 'Feature', properties: f.attributes, geometry: null }));
  }
  return data.features || [];
}


function isZoneActive(
  zoneFeature: GeoJSONFeature,
  generalTimeRules: GeneralTimeProperties[],
  specificTimeRules: SpecificTimeProperties[],
  targetDateTime: Date
): boolean {
  const zoneId = zoneFeature.properties?.uidAmsl || zoneFeature.properties?.OBJECTID?.toString();

  if (!zoneId) {
    // console.warn("Zone feature missing ID for time rule linkage:", zoneFeature.properties);
    return false;
  }

  const relevantGeneralRules = generalTimeRules.filter(rule => rule.ParentID === zoneId || rule.childID === zoneId);
  const relevantSpecificRules = specificTimeRules.filter(rule => rule.ParentID === zoneId || rule.childID === zoneId);

  // 1. Vérifier les règles générales permanentes
  for (const rule of relevantGeneralRules) {
    if (rule.permanent === 'YES' && rule.status === 'ACTIVE') {
      return true;
    }
  }

  // 2. Vérifier les règles générales avec date/heure de début/fin
  for (const rule of relevantGeneralRules) {
    if (rule.startDateTime && rule.endDateTime && rule.status === 'ACTIVE') {
      try {
        const interval = { start: new Date(rule.startDateTime), end: new Date(rule.endDateTime) };
        if (isWithinInterval(targetDateTime, interval)) {
          return true;
        }
      } catch(e) {
        console.warn("Error parsing general rule date interval:", rule, e);
      }
    }
  }
  
  // 3. Vérifier les règles spécifiques
  for (const rule of relevantSpecificRules) {
    if (rule.status !== 'ACTIVE') continue;

    // Logique pour les jours de la semaine
    if (rule.days) {
      const activeDays = rule.days.split(',').map(d => dayStringToNumber(d.trim()));
      const targetDay = getDay(targetDateTime); // 0 (Dimanche) à 6 (Samedi)
      if (!activeDays.includes(targetDay)) {
        continue; // Pas actif ce jour-là
      }
    }

    if (rule.writtenStartTime && rule.writtenEndTime) {
      try {
        const startHour = parseInt(rule.writtenStartTime.substring(0, 2), 10);
        const startMinute = parseInt(rule.writtenStartTime.substring(2, 4), 10);
        const endHour = parseInt(rule.writtenEndTime.substring(0, 2), 10);
        const endMinute = parseInt(rule.writtenEndTime.substring(2, 4), 10);

        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
          console.warn("Invalid time format in specific rule:", rule);
          continue;
        }

        const targetHour = targetDateTime.getHours();
        const targetMinute = targetDateTime.getMinutes();

        const targetTimeInMinutes = targetHour * 60 + targetMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        let endTimeInMinutes = endHour * 60 + endMinute;
        
        // Handle case where end time is on the next day (e.g., 22:00 - 02:00)
        // For simplicity, if end time is less than start time, assume it crosses midnight
        // A more robust solution would check TimeUnit if available.
        if (endTimeInMinutes < startTimeInMinutes) { 
          if (targetTimeInMinutes >= startTimeInMinutes || targetTimeInMinutes <= endTimeInMinutes) {
            return true;
          }
        } else { // End time is on the same day
          if (targetTimeInMinutes >= startTimeInMinutes && targetTimeInMinutes <= endTimeInMinutes) {
            return true;
          }
        }
      } catch (e) {
        console.warn("Error parsing specific rule time:", rule, e);
      }
    } else if (rule.TimeUnit === 'PERMANENT' && rule.status === 'ACTIVE') { // Specific rule marked as permanent
        return true;
    }
    // If a specific rule matches the day but has no explicit time, or time parsing failed,
    // we might consider it active for the whole day if no other specific time rules contradict.
    // For now, if it matched by day and had no valid time, we don't make it active unless time parsing succeeded.
    // If a rule has day constraints but no time constraints, we might assume it's active all day.
    // This part needs clarification based on API spec for 'TimeUnit' and 'sunrise'/'sunset'.
    // Let's assume if days match and no time, it's active for those days.
    else if (rule.days && !rule.writtenStartTime && !rule.writtenEndTime) {
        // Already checked day match above, so if no time is specified, assume active for the day.
        return true;
    }


  }

  return false; // Aucune règle active trouvée pour cette date/heure
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterTimeParam = searchParams.get('time'); // ISO string date-time ou "now"
  // const spatialFilter = searchParams.get('bounds'); // Future implementation

  let targetDateTime: Date;
  if (filterTimeParam === 'now' || !filterTimeParam) {
    targetDateTime = new Date();
  } else {
    try {
      targetDateTime = parseISO(filterTimeParam);
    } catch (e) {
      return NextResponse.json({ error: 'Format de date/heure invalide pour le filtre temporel.' }, { status: 400 });
    }
  }

  try {
    const geoParams = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      f: 'geojson',
      outSR: '4326',
      resultRecordCount: '2000', // TODO: Implement pagination
    });
    // if (spatialFilter) { ... }

    const allGeoFeatures = await fetchArcGisFeatures(GEOMETRY_SERVICE_URL, geoParams);

    const commonTimeParams = new URLSearchParams({ where: '1=1', outFields: '*', f: 'json', resultRecordCount: '2000' });
    
    // Fetching rules - these return Feature[] where properties are in `feature.attributes`
    const generalTimeFeaturesRaw = await fetchArcGisFeatures(GENERAL_TIME_SERVICE_URL, commonTimeParams);
    const specificTimeFeaturesRaw = await fetchArcGisFeatures(SPECIFIC_TIME_SERVICE_URL, commonTimeParams);
    
    // Extract properties
    const generalTimeRules: GeneralTimeProperties[] = generalTimeFeaturesRaw.map(f => f.properties as GeneralTimeProperties);
    const specificTimeRules: SpecificTimeProperties[] = specificTimeFeaturesRaw.map(f => f.properties as SpecificTimeProperties);

    let activeGeoFeatures = allGeoFeatures;
    if (filterTimeParam) { // Only filter if a time filter is explicitly requested (e.g. "now")
        activeGeoFeatures = allGeoFeatures.filter(feature =>
            isZoneActive(feature, generalTimeRules, specificTimeRules, targetDateTime)
        );
    }


    const filteredGeoJson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: activeGeoFeatures,
    };

    return NextResponse.json(filteredGeoJson);

  } catch (error) {
    console.error('Error in /api/uav-zones with time filtering:', error);
    let errorMessage = 'Internal Server Error while filtering UAV zones';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
