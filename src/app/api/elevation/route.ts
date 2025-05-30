// src/app/api/elevation/route.ts
import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_Maps_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not configured.');
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required.' }, { status: 400 });
  }

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude.' }, { status: 400 });
  }

  const elevationApiUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${numLat},${numLng}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(elevationApiUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error from Google Elevation API' }));
      console.error('Google Elevation API Error:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch elevation: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return NextResponse.json({ elevation: data.results[0].elevation });
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ elevation: null, message: 'No elevation data found for this location.' });
    } else {
      console.error('Google Elevation API returned status:', data.status, data.error_message);
      throw new Error(data.error_message || `Elevation API request failed with status: ${data.status}`);
    }
  } catch (error) {
    console.error('Error in /api/elevation:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
