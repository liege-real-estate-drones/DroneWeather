// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const apiKey = process.env.METEOSOURCE_API_KEY;

  if (!apiKey) {
    // Log the error on the server for debugging purposes
    console.error('API key is not configured on the server');
    return NextResponse.json({ error: 'API key is not configured on the server. Please contact the administrator.' }, { status: 500 });
  }

  const meteosourceUrl = `https://www.meteosource.com/api/v1/free/point?lat=${lat}&lon=${lon}&sections=current,hourly&language=fr&units=metric&key=${apiKey}`;

  try {
    const meteoResponse = await fetch(meteosourceUrl);
    if (!meteoResponse.ok) {
      let errorBody = { message: `Meteosource API error: ${meteoResponse.status}` };
      try {
        // Try to parse the error response from Meteosource
        const externalError = await meteoResponse.json();
        errorBody.message = externalError.message || errorBody.message;
      } catch (e) {
        // Ignore if the body isn't JSON or if parsing fails
        console.warn('Could not parse error response from Meteosource:', e);
      }
      // Log the detailed error on the server
      console.error(`Meteosource API request failed: ${meteoResponse.status}, Body: ${JSON.stringify(errorBody)}`);
      return NextResponse.json({ error: errorBody.message }, { status: meteoResponse.status });
    }
    const data = await meteoResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching from Meteosource in API route:', error);
    // Return a generic error message to the client
    return NextResponse.json({ error: 'Failed to fetch weather data from Meteosource' }, { status: 500 });
  }
}
