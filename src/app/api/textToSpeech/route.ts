// Custom imports
import { ElevenLabsTTS } from '@/util/ElevenLabsTTS';

/**
 * POST /api/textToSpeech
 *
 * Receives JSON with text, uses ElevenLabsTTS to generate speech audio,
 * and streams the audio back as an MPEG response.
 *
 * @param {Request} request     - Incoming HTTP request containing JSON { text: string }
 * @returns {Promise<Response>} - HTTP response streaming the generated audio with Content-Type
 *                                'audio/mpeg'
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const { text, voiceId } = await request.json();
        
        if (!text || typeof text !== 'string' || !text.trim()) {
            return new Response('Invalid or empty text input.', { status: 400 });
        }
        
        if (!voiceId || typeof voiceId !== 'string') {
            return new Response("Missing or invalid 'voiceId' field", { status: 400 });
        }
        
        const ttsHandler  = new ElevenLabsTTS(voiceId);
        const audioStream = await ttsHandler.getAudioStream(text);
        return new Response(audioStream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store',
            },
        });
    }
    catch (error) {
       console.error('Error in textToSpeech API:', error);
       return new Response('Internal Server Error', { status: 500 });
    }
}
