// src/app/api/uav-zones/route.ts
import { NextResponse } from 'next/server';

const ARCGIS_SERVICE_URL = 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/0';

export async function GET() {
  try {
    // Parameters for the ArcGIS query
    const params = new URLSearchParams({
      where: '1=1', // Retrieve all features
      outFields: '*', // Retrieve all fields
      f: 'geojson', // Request GeoJSON format
      outSR: '4326', // Request coordinates in WGS84 (latitude/longitude)
      resultRecordCount: '2000', // Maximum records per page (as per service limit)
      // To implement full pagination, logic with resultOffset would be added here
    });

    const response = await fetch(`${ARCGIS_SERVICE_URL}/query?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ArcGIS API Error:', response.status, errorData);
      throw new Error(`Failed to fetch UAV zones: ${response.status} ${response.statusText}`);
    }

    const geojsonData = await response.json();

    // Future: Check if geojsonData.features.length === 2000 and
    // if geojsonData.exceededTransferLimit === true to implement full pagination.
    // For now, returning the first batch.

    return NextResponse.json(geojsonData);

  } catch (error) {
    console.error('Error in /api/uav-zones:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
