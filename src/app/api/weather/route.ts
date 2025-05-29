// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import type { MeteosourceErrorResponse } from '@/types'; // Assurez-vous d'avoir ce type

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Les coordonnées de latitude et longitude sont requises.' }, { status: 400 });
  }

  // Validation simple des coordonnées (Meteosource validera plus en détail)
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);
  if (isNaN(numLat) || isNaN(numLon) || numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) {
    return NextResponse.json({ error: 'Coordonnées invalides. Latitude doit être entre -90 et 90, Longitude entre -180 et 180.' }, { status: 400 });
  }

  const apiKey = process.env.METEOSOURCE_API_KEY;

  if (!apiKey) {
    console.error('La clé API Meteosource n\'est pas configurée sur le serveur.');
    return NextResponse.json({ error: 'Le service météo n\'est pas configuré sur le serveur. Veuillez contacter l\'administrateur.' }, { status: 500 });
  }

  const meteosourceUrl = `https://www.meteosource.com/api/v1/free/point?lat=${lat}&lon=${lon}&sections=current,hourly&language=fr&units=metric&key=${apiKey}`;

  try {
    const meteoResponse = await fetch(meteosourceUrl);

    if (!meteoResponse.ok) {
      let errorMessage = `Erreur API Meteosource : ${meteoResponse.status}`;
      try {
        const externalError = await meteoResponse.json() as MeteosourceErrorResponse;
        // Log de l'erreur complète côté serveur pour le débogage
        console.error(`Erreur détaillée de Meteosource (${meteoResponse.status}):`, JSON.stringify(externalError, null, 2));

        if (externalError.error) {
          errorMessage = `Erreur Meteosource : ${externalError.error}`;
        }
        if (externalError.detail) {
          if (typeof externalError.detail === 'string') {
            errorMessage += ` Détail : ${externalError.detail}`;
          } else if (Array.isArray(externalError.detail)) {
            const details = externalError.detail.map(d => `Paramètre '${d.loc.join('.')}' : ${d.msg}`).join(', ');
            errorMessage += ` Détails : ${details}`;
          }
        }
      } catch (e) {
        // Si le corps de l'erreur n'est pas JSON ou si l'analyse échoue
        console.warn('Impossible d\'analyser la réponse d\'erreur JSON de Meteosource:', e);
        const textError = await meteoResponse.text(); // Tenter de lire comme texte
        console.error('Réponse d\'erreur brute de Meteosource:', textError);
        errorMessage = `Erreur API Meteosource (${meteoResponse.status}). Impossible d'analyser les détails de l'erreur. Réponse brute: ${textError.substring(0,100)}`;
      }
      
      console.error(`Échec de la requête API Meteosource : ${meteoResponse.status}. Message construit : ${errorMessage}`);
      return NextResponse.json({ error: errorMessage }, { status: meteoResponse.status });
    }

    const data = await meteoResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Erreur lors de la récupération depuis Meteosource dans la route API:', error);
    return NextResponse.json({ error: 'Échec de la récupération des données météo depuis Meteosource. Erreur interne du serveur.' }, { status: 500 });
  }
}
