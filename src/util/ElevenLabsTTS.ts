// Library imports
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'; // npm install @elevenlabs/elevenlabs-js
import 'dotenv/config';                                       // npm install dotenv

// ------------------------------------ //
//   T Y P E    D E F I N I T I O N S   //
// ------------------------------------ //
type OutputFormat =
| "mp3_22050_32"
| "mp3_44100_32"
| "mp3_44100_64"
| "mp3_44100_96"
| "mp3_44100_128"
| "mp3_44100_192"
| "pcm_8000"
| "pcm_16000"
| "pcm_22050"
| "pcm_24000"
| "pcm_44100"
| "pcm_48000"
| "ulaw_8000"
| "alaw_8000"
| "opus_48000_32"
| "opus_48000_64"
| "opus_48000_96"
| "opus_48000_128"
| "opus_48000_192";

type TextToSpeechRequest = {
    text        : string;
    modelId     : string;
    outputFormat: OutputFormat;
}

// --------------------- //
//   C O N S T A N T S   //
// --------------------- //
/** The ElevenLabs model used for generation */
const MODEL_ID                    = "eleven_turbo_v2_5";
/** The output format for the audio */
const OUTPUT_FORMAT: OutputFormat = 'mp3_44100_128';

/**
 * A high-quality speech synthesis wrapper for the ElevenLabs TTS API.
 * Supports streaming TTS with buffering and HTML5 playback.
 */
export class ElevenLabsTTS {
    /** ElevenLabs API client */
    private readonly elevenLabsClient: ElevenLabsClient;
    
    /** Voice ID used for speech (e.g., Rachel, EXAVITQu4vr4xnSDxMaL) */
    private readonly voiceId: string;
    
    /** Current audio element playing (if any) */
    private currentAudio: HTMLAudioElement | null = null;
    
    /** Indicates whether speech is currently playing */
    private isPlaying  = false;
    
    /**
     * Constructs a new ElevenLabsTTS instance for a specific voice ID.
     *
     * @param voiceId - The ElevenLabs voice ID (e.g., "Rachel" or a UUID)
     */
    constructor(voiceId: string) {
        this.voiceId = voiceId;
        this.elevenLabsClient = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY!
        });
    }
    
    /**
     * Generates speech audio stream for the given text using ElevenLabs API.
     *
     * This method requests the ElevenLabs text-to-speech service to convert the
     * provided text into an audio stream in the configured output format.
     * The returned stream can be directly forwarded to clients or further processed.
     *
     * @param text The text to convert to speech.
     * 
     * @returns a readable stream of audio data.
     *
     * @throws an error if the ElevenLabs API call fails or if text is invalid.
     */
    public async getAudioStream(text: string): Promise<ReadableStream<Uint8Array>> {
        const request: TextToSpeechRequest = {
            text        : text,
            modelId     : MODEL_ID,
            outputFormat: OUTPUT_FORMAT,
        };
        
        return await this.elevenLabsClient.textToSpeech.convert(this.voiceId, request);
    }
    
    /**
     * Converts the given text to speech using ElevenLabs API and plays it.
     *
     * This method opens a WebSocket connection to ElevenLabs, streams the
     * synthesized audio chunks, buffers them, and plays the full result.
     *
     * @param text - The text to convert to speech
     */
    public async textToSpeech(text: string): Promise<void> {
        if (!text || !text.trim()) {
            console.warn("Empty text, skipping speech.");
            return;
        }
        
        this.cancel(); // Stop any previous playback
        this.isPlaying = true;
        
        try {
            const request: TextToSpeechRequest = {
                text        : text,
                modelId     : MODEL_ID,
                outputFormat: OUTPUT_FORMAT,
            };
            
            const audioStream  = await this.elevenLabsClient.textToSpeech.convert(this.voiceId,
                                                                                  request);
            // Read the stream, collect all chunks, and play the full audio
            const reader = audioStream.getReader();
            const chunks: Uint8Array[] = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    chunks.push(value);
                }
            }
            
            const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
            const fullAudio = new Uint8Array(totalLength);
            
            let offset = 0;
            for (const chunk of chunks) {
                fullAudio.set(chunk, offset);
                offset += chunk.length;
            }
            
            this.playAudio(fullAudio);
            this.isPlaying = false;
        }
        catch (error) {
            console.error("ElevenLabsTTS.textToSpeech() failed:", error);
        }
        finally {
            this.isPlaying = false;
        }
    }
    
    /**
     * Cancels the currently playing speech (if any) and closes the WebSocket connection.
     *
     * This method is safe to call multiple times and ensures any in-flight speech is stopped.
     */
    public cancel(): void {
        this.isPlaying = false;
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }
    
    /**
     * Returns true if speech is actively playing.
     *
     * @returns a boolean indicating whether audio is currently being spoken.
     */
    public isPlayingAudio(): boolean {
        return this.isPlaying;
    }
    
    /**
     * Waits asynchronously until all speech has finished playing.
     *
     * Useful when chaining playback with other UI events.
     */
    public async waitUntilSpeechFinished(): Promise<void> {
        while (this.isPlaying) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    
    /**
     * Plays a given audio buffer using HTMLAudioElement.
     *
     * @param audioChunk - The complete audio data to play
     */
    private playAudio(audioChunk: Uint8Array) {
        // Create a new Uint8Array backed by a true ArrayBuffer
        const safeChunk = new Uint8Array(audioChunk);
        
        const blob = new Blob([safeChunk], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        this.currentAudio = audio;
        
        audio.play().catch(err => {
            console.error("Playback failed:", err);
            this.isPlaying = false;
            URL.revokeObjectURL(url);
        });
        
        audio.onerror = (e) => {
            console.error("Audio play error:", e);
            this.isPlaying = false;
            URL.revokeObjectURL(url);
        };
        
        audio.onended = () => {
            this.isPlaying = false;
            URL.revokeObjectURL(url);
        };
    }
}