
// src/app/api/uav-zones/route.ts
import { NextResponse } from 'next/server';
import type { Feature as GeoJSONFeature, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';
import { parseISO, isWithinInterval, getDay } from 'date-fns';
import type { GeneralTimeProperties, SpecificTimeProperties } from '@/types';

const GEOMETRY_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/0';
const SPECIFIC_TIME_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Specific_Time_Download_Prod/FeatureServer/0';
const GENERAL_TIME_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/General_Time_Download_Prod/FeatureServer/0';

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
  const zoneName = zoneFeature.properties?.name || 'Unknown Name';

  // console.log(`[isZoneActive Debug] Evaluating Zone: ID=${zoneId}, Name=${zoneName}, TargetDateTime=${targetDateTime.toISOString()}`);

  if (!zoneId) {
    // console.log(`[isZoneActive Debug] Zone ID is missing for feature. Properties:`, zoneFeature.properties);
    return false;
  }

  const relevantGeneralRules = generalTimeRules.filter(rule => rule.ParentID === zoneId || rule.childID === zoneId);
  const relevantSpecificRules = specificTimeRules.filter(rule => rule.ParentID === zoneId || rule.childID === zoneId);

  // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Found ${relevantGeneralRules.length} general rules, ${relevantSpecificRules.length} specific rules.`);

  // 1. Vérifier les règles générales permanentes
  for (const rule of relevantGeneralRules) {
    // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Checking General Rule (Permanent):`, rule);
    // ArcGIS service query already filters for status='validated' and last_version='yes'
    if (rule.permanent === '1') {
      // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED General Rule (Permanent based on 'permanent: "1"'). Zone IS ACTIVE.`);
      return true;
    }
  }

  // 2. Vérifier les règles générales avec date/heure de début/fin
  for (const rule of relevantGeneralRules) {
    // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Checking General Rule (Date/Time Interval):`, rule);
    // ArcGIS service query already filters for status='validated' and last_version='yes'
    // Only check interval if not explicitly permanent (permanent !== '1')
    if (rule.permanent !== '1' && rule.startDateTime && rule.endDateTime) {
      try {
        const interval = { start: new Date(rule.startDateTime), end: new Date(rule.endDateTime) };
        // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Interval: Start=${interval.start.toISOString()}, End=${interval.end.toISOString()}`);
        if (isWithinInterval(targetDateTime, interval)) {
          // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED General Rule (Date/Time Interval). Zone IS ACTIVE.`);
          return true;
        }
      } catch(e) {
        console.warn(`[isZoneActive Debug] Zone ID ${zoneId}: Error parsing general rule date interval:`, rule, e);
      }
    }
  }
  
  // 3. Vérifier les règles spécifiques
  for (const rule of relevantSpecificRules) {
    // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Checking Specific Rule:`, rule);
    // ArcGIS service query already filters for status='validated' and last_version='yes'

    // TODO: Implement sunrise/sunset logic.
    // This will require integrating a weather API or an astronomical calculation library
    // to determine the actual sunrise and sunset times for the zone's location and the targetDate.
    // The current implementation only handles fixed times and permanent rules.
    // Example of how it might be structured:
    // if (rule.sunrise === 'start' || rule.sunset === 'stop' || rule.writtenStartTime?.includes('sunrise') || rule.writtenEndTime?.includes('sunset')) {
    //   // Fetch/calculate sunrise/sunset times for zone's location & targetDateTime
    //   // Adjust rule.writtenStartTime/writtenEndTime based on offsets (e.g., SUNRISE+30 min)
    //   // Then proceed with the time comparison logic below
    //   console.warn(`[isZoneActive Debug] Zone ID ${zoneId}: Rule depends on sunrise/sunset, not yet implemented. Rule:`, rule);
    //   continue; // Skip rules dependent on sunrise/sunset for now
    // }

    // Logique pour les jours de la semaine
    if (rule.days) {
      const activeDaysSkeyes = rule.days.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
      let targetDayFromDateFns = getDay(targetDateTime); // date-fns: 0 (Sun) to 6 (Sat)
      
      // Convert targetDayFromDateFns (0-6, Sun-Sat) to Skeyes convention (1-7, Mon-Sun)
      const targetDaySkeyes = (targetDayFromDateFns === 0) ? 7 : targetDayFromDateFns;

      // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Specific Rule Day Check: RuleDaysSkeyes=${rule.days}, ParsedActiveDaysSkeyes=${activeDaysSkeyes}, TargetDaySkeyes=${targetDaySkeyes}`);
      if (!activeDaysSkeyes.includes(targetDaySkeyes)) {
        // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Specific Rule day mismatch. Skipping.`);
        continue; // Pas actif ce jour-là
      }
      // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Specific Rule day MATCHED.`);
    }

    if (rule.writtenStartTime && rule.writtenEndTime && typeof rule.writtenStartTime === 'string' && typeof rule.writtenEndTime === 'string') {
      // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Specific Rule Time Check: StartTime='${rule.writtenStartTime}', EndTime='${rule.writtenEndTime}'`);
      try {
        const startTimeParts = rule.writtenStartTime.split('.'); // Expect "HH.MM.SS" or "HH.MM"
        const endTimeParts = rule.writtenEndTime.split('.');   // Expect "HH.MM.SS" or "HH.MM"

        if (startTimeParts.length < 2 || endTimeParts.length < 2) {
          console.warn(`[isZoneActive Debug] Zone ID ${zoneId}: Invalid time format (not enough parts) in specific rule:`, rule);
          continue;
        }

        const startHour = parseInt(startTimeParts[0], 10);
        const startMinute = parseInt(startTimeParts[1], 10);
        // const startSecond = startTimeParts.length > 2 ? parseInt(startTimeParts[2], 10) : 0; // Seconds are not used in current logic

        const endHour = parseInt(endTimeParts[0], 10);
        const endMinute = parseInt(endTimeParts[1], 10);
        // const endSecond = endTimeParts.length > 2 ? parseInt(endTimeParts[2], 10) : 0; // Seconds are not used in current logic

        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
          console.warn(`[isZoneActive Debug] Zone ID ${zoneId}: Invalid time format (NaN after parsing parts) in specific rule:`, rule);
          continue;
        }

        const targetHour = targetDateTime.getUTCHours(); // Use UTC hours for comparison if times are UTC
        const targetMinute = targetDateTime.getUTCMinutes();

        const targetTimeInMinutes = targetHour * 60 + targetMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        let endTimeInMinutes = endHour * 60 + endMinute;
        
        // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: TargetTimeUTC(min)=${targetTimeInMinutes}, StartTime(min)=${startTimeInMinutes}, EndTime(min)=${endTimeInMinutes}`);
        
        if (endTimeInMinutes < startTimeInMinutes) { // Handle case where end time is on the next day (e.g. 22:00 - 02:00)
          if (targetTimeInMinutes >= startTimeInMinutes || targetTimeInMinutes <= endTimeInMinutes) {
            // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED Specific Rule (Time, Cross-Midnight). Zone IS ACTIVE.`);
            return true;
          }
        } else { // End time is on the same day
          if (targetTimeInMinutes >= startTimeInMinutes && targetTimeInMinutes <= endTimeInMinutes) {
            // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED Specific Rule (Time, Same Day). Zone IS ACTIVE.`);
            return true;
          }
        }
      } catch (e) {
        console.warn(`[isZoneActive Debug] Zone ID ${zoneId}: Error parsing specific rule time string:`, rule.writtenStartTime, rule.writtenEndTime, e);
      }
    } else if (rule.TimeUnit === 'PERMANENT') {
        // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED Specific Rule (TimeUnit=PERMANENT). Zone IS ACTIVE.`);
        return true;
    }
    else if (rule.days && (!rule.writtenStartTime || !rule.writtenEndTime)) { // If days match and no specific time, assume active all day
        // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: PASSED Specific Rule (Day Match, No Time Specified, assuming active all day). Zone IS ACTIVE.`);
        return true;
    }
    // console.log(`[isZoneActive Debug] Zone ID ${zoneId}: Specific Rule did not result in activation.`);
  }

  // console.log(`[isZoneActive Debug] Zone ID ${zoneId}, Name=${zoneName}: No active rules found. Zone IS NOT ACTIVE.`);
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
    
    const generalTimeFeaturesRaw = await fetchArcGisFeatures(GENERAL_TIME_SERVICE_URL, commonTimeParams);
    const specificTimeFeaturesRaw = await fetchArcGisFeatures(SPECIFIC_TIME_SERVICE_URL, commonTimeParams);
    
    const generalTimeRules: GeneralTimeProperties[] = generalTimeFeaturesRaw.map(f => f.properties as GeneralTimeProperties);
    const specificTimeRules: SpecificTimeProperties[] = specificTimeFeaturesRaw.map(f => f.properties as SpecificTimeProperties);

    let activeGeoFeatures = allGeoFeatures;
    if (filterTimeParam) { // Only filter if a time filter is explicitly requested (e.g. "now")
        // console.log(`[API uav-zones] Filtering ${allGeoFeatures.length} features for time: ${targetDateTime.toISOString()}`);
        activeGeoFeatures = allGeoFeatures.filter(feature =>
            isZoneActive(feature, generalTimeRules, specificTimeRules, targetDateTime)
        );
        // console.log(`[API uav-zones] Found ${activeGeoFeatures.length} active features.`);
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

