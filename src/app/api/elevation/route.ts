
// src/app/api/elevation/route.ts
import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_Maps_API_KEY;

export async function GET(request: Request) {
  try {
    // Explicit API Key Check
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
      console.error('[API Elevation] GOOGLE_MAPS_API_KEY is not configured or is empty.');
      return NextResponse.json({ error: 'Server configuration error: Google Maps API key is missing or invalid for elevation service.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and longitude are required for elevation.' }, { status: 400 });
    }

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      return NextResponse.json({ error: 'Invalid latitude or longitude for elevation.' }, { status: 400 });
    }

    const elevationApiUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${numLat},${numLng}&key=${GOOGLE_MAPS_API_KEY}`;
    
    // console.log(`[API Elevation] Fetching elevation from: ${elevationApiUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED_API_KEY')}`);

    const response = await fetch(elevationApiUrl);

    if (!response.ok) {
      let errorDetailMessage = `Google Elevation API responded with status ${response.status}`;
      try {
        const googleErrorJson = await response.json();
        console.error(`[API Elevation] Google Elevation API Error (Status ${response.status}, URL: ${elevationApiUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED_API_KEY')}):`, JSON.stringify(googleErrorJson));
        // Prefer Google's error_message if available and non-empty
        if (googleErrorJson && typeof googleErrorJson.error_message === 'string' && googleErrorJson.error_message.trim() !== '') {
          errorDetailMessage = googleErrorJson.error_message;
        } else if (googleErrorJson && typeof googleErrorJson.status === 'string' && googleErrorJson.status.trim() !== '') {
          errorDetailMessage = `Google Elevation API returned status: ${googleErrorJson.status}`;
        }
      } catch (e) {
        const statusText = response.statusText || 'Failed to fetch details';
        console.error(`[API Elevation] Failed to parse JSON error response from Google Elevation API (Status ${response.status}, StatusText: ${statusText}). Non-JSON response might have been returned from URL: ${elevationApiUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED_API_KEY')}.`);
        errorDetailMessage += ` (${statusText}). Check server logs for more details.`;
      }
      // Ensure errorDetailMessage is not empty before throwing
      const finalGoogleErrorMessage = (errorDetailMessage && errorDetailMessage.trim() !== '') ? errorDetailMessage : `Unknown error with Google Elevation API, status: ${response.status}. Ensure the API key is valid and the Elevation API is enabled.`;
      console.error(`[API Elevation] Throwing error after !response.ok: ${finalGoogleErrorMessage}`);
      throw new Error(finalGoogleErrorMessage); // This error will be caught by the outer catch
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return NextResponse.json({ elevation: data.results[0].elevation });
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ elevation: null, message: 'No elevation data found for this location.' });
    } else {
      let googleApiErrorMessage = '';
      if (data && typeof data.error_message === 'string' && data.error_message.trim() !== '') {
        googleApiErrorMessage = data.error_message;
      } else if (data && typeof data.status === 'string' && data.status.trim() !== '') {
        googleApiErrorMessage = `Elevation API request failed with Google status: ${data.status}`;
      } else {
        googleApiErrorMessage = `Unknown error from Google Elevation API after successful fetch. Status: ${data.status || 'UNKNOWN'}. Google's error_message was empty or not provided.`;
      }
      console.error('[API Elevation] Google Elevation API returned non-OK/ZERO_RESULTS status:', data.status, 'Message:', googleApiErrorMessage, 'Full response:', JSON.stringify(data), `URL: ${elevationApiUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED_API_KEY')}`);
      
      throw new Error(googleApiErrorMessage); // This error will be caught by the outer catch
    }

  } catch (error: any) {
    console.error('[API Elevation] Critical error in /api/elevation GET route:', error); 

    let message: string;
    if (error && typeof error.message === 'string' && error.message.trim() !== '') {
      message = error.message;
    } else if (typeof error === 'string' && error.trim() !== '') {
      message = error;
    } else if (error && typeof error.toString === 'function') {
      const errStr = error.toString();
      // Avoid using generic "[object Object]" if possible
      message = (errStr !== '[object Object]' && errStr.trim() !== '') ? errStr : 'An unexpected server error occurred while processing the elevation request.';
    } else {
      message = 'An unexpected server error occurred while processing the elevation request and no specific message could be extracted.';
    }
    
    // This final check ensures 'finalMessage' is never empty.
    const finalMessage = (message && message.trim() !== '') ? message : 'An unexpected server error occurred and a general message was used because the original error was empty or uninformative.';
    console.error(`[API Elevation] Sending 500 response with error message: "${finalMessage}"`);
    
    return NextResponse.json({ error: finalMessage }, { status: 500 });
  }
}
