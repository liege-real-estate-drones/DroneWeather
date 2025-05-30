
// src/app/api/elevation/route.ts
import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_Maps_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not configured for /api/elevation.');
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required for elevation.' }, { status: 400 });
  }

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude for elevation.' }, { status: 400 });
  }

  const elevationApiUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${numLat},${numLng}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(elevationApiUrl);
    if (!response.ok) {
      let errorDetailMessage = `Google Elevation API responded with status ${response.status}`;
      try {
        const googleErrorJson = await response.json();
        errorDetailMessage = googleErrorJson.error_message || googleErrorJson.status || errorDetailMessage;
        // Log the detailed error from Google
        console.error('Google Elevation API Error (Status ${response.status}):', JSON.stringify(googleErrorJson));
      } catch (e) {
        console.error('Failed to parse JSON error response from Google Elevation API, or Google API returned non-JSON error.');
        errorDetailMessage += ` (${response.statusText || 'Failed to fetch details'})`;
      }
      throw new Error(errorDetailMessage);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return NextResponse.json({ elevation: data.results[0].elevation });
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ elevation: null, message: 'No elevation data found for this location.' });
    } else {
      // Handle other Google API statuses like REQUEST_DENIED, INVALID_REQUEST, OVER_QUERY_LIMIT, UNKNOWN_ERROR
      const googleApiErrorMessage = data.error_message || `Elevation API request failed with Google status: ${data.status}`;
      console.error('Google Elevation API returned status:', data.status, googleApiErrorMessage);
      throw new Error(googleApiErrorMessage);
    }
  } catch (error) {
    console.error('Error in /api/elevation route:', error instanceof Error ? error.message : String(error));
    let errorMessage = 'An unexpected error occurred while fetching elevation.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
