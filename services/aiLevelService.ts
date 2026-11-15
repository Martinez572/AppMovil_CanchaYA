import { supabase } from '../lib/supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export interface AIRecommendation {
  badgeText: string;
  reason: string;
  levelCategory: 'easy' | 'balanced' | 'hard';
}

export async function getAILevelRecommendation(
  userId: string,
  sport: string
): Promise<AIRecommendation> {
  try {
    // 1. Consultar historial de valoraciones reales post-partido del usuario en Supabase
    const { data: ratings } = await supabase
      .from('post_match_ratings')
      .select('perception, created_at')
      .eq('user_id', userId)
      .eq('sport', sport)
      .order('created_at', { ascending: false })
      .limit(5);

    // Si no hay valoraciones aun, enviar recomendacion inicial para principiantes
    if (!ratings || ratings.length === 0) {
      return {
        badgeText: 'Nivel Ideal para Principiantes',
        reason: 'Primera vez en este deporte. ¡Únete a un partido para calibrar tu nivel con IA!',
        levelCategory: 'balanced',
      };
    }

    const historySummary = ratings.map((r) => r.perception).join(', ');

    // 2. Prompt diseñado para Gemini
    const promptText = `
Eres la IA de CanchaYa (LevelMatch AI), un sistema inteligente de emparejamiento deportivo.
Analiza las últimas percepciones de nivel de un jugador en el deporte "${sport}": [${historySummary}].

Opciones de percepcion:
- "easy": El partido le pareció muy fácil / poco exigente.
- "balanced": El partido le pareció parejo y equilibrado.
- "hard": El partido le pareció muy exigente / los rivales eran superiores.

Responde ÚNICAMENTE con un objeto JSON sin markdown con esta estructura exacta:
{
  "badgeText": "Frase de 3 a 5 palabras para un badge (ej: Nivel Competitivo Ideal, Desafío de Alto Nivel, Ritmo Recreativo)",
  "reason": "Explicación breve de 1 sola frase de por qué le recomiendas este tipo de partidos.",
  "levelCategory": "balanced"
}
`;

    // 3. Petición HTTP directa a Google Gemini 1.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      const parsed: AIRecommendation = JSON.parse(rawText);
      console.log('⚡ Respuesta real de Google Gemini 1.5 Flash:', parsed);
      return parsed;
    }

    throw new Error('Sin respuesta válida de Gemini');
  } catch (error) {
    console.error('Error en servicio Gemini AI LevelMatch:', error);
    return {
      badgeText: 'Nivel Equilibrado',
      reason: 'Partidos recomendados para mantener tu ritmo deportivo actual.',
      levelCategory: 'balanced',
    };
  }
}