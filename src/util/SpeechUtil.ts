// Custom imports
import { DBPersona, Gender, TextToSpeechProvider } from "@/types";
import { promiseWithTimeout } from "@/util/utils";

// --------------------- //
//   C O N S T A N T S   //
// --------------------- //
/** The audio format of the TTS provider response */
const RESPONSE_AUDIO_FORMAT: 'mp3' | 'pcm' = 'mp3';

/** Open AI male voices */
const MALE_VOICES_OPENAI_API   = ['onyx', 'alloy', 'echo'];
/** Open AI female voices */
const FEMALE_VOICES_OPENAI_API = ['shimmer', 'nova', 'fable'];

/** ElevenLabs male voice IDs */
const MALE_VOICE_IDS_ELEVENLABS_API   = [
    '1SM7GgM6IMuvQlz2BwM3',
    'JBFqnCBsd6RMkjVDRZzb'
];
/**ElevenLabs female voice IDs */
const FEMALE_VOICE_IDS_ELEVENLABS_API = [
    'EXAVITQu4vr4xnSDxMaL',
    'OYTbf65OHHFELVut7v2H'
];
const DEFAULT_VOICE_ID_ELEVEN_LABS_API = MALE_VOICE_IDS_ELEVENLABS_API[0];

/** Curated list of common male voice names */
const MALE_NAMES_WEB_API   = ['David', 'Mark', 'Alex', 'Fred', 'Daniel', 'Tom'];
/** Curated list of common male voice names */
const FEMALE_NAMES_WEB_API = ['Zira', 'Samantha', 'Hazel', 'Susan', 'Victoria', 'Karen'];


/**
 * Singleton class for managing speech synthesis with personas and voice assignments.
 * Handles queuing, voice registration, and speech playback using Web Speech API.
 */
export class SpeechUtil {
    // Singleton instance
    private static instance: SpeechUtil;
    
    // Speech synthesis API object
    private synthesis: SpeechSynthesis | null = null;
     
    // Current voice assigned for speech utterances
    private currentVoice: SpeechSynthesisVoice | null = null;
    
    // Tracks the current stream identity. Incrementing it invalidates all earlier queued chunks.
    private activeStreamId: number = 0;
    
    // Queue of text chunks to be spoken sequentially
    private speechQueue: {
        text    : string
        persona : DBPersona
        streamId: number
    }[] = [];
    
    // Indicates if speech is currently being spoken
    private isSpeaking: boolean = false;
    
    // Buffer to accumulate partial text until sentence-ending punctuation
    private textBuffer: string = '';
    
    // Map to cache the voice for each persona.
    // The key is the persona name, and the value is the corresponding voice.
    private personaVoiceMap: Map<string, SpeechSynthesisVoice | string> = new Map();
    
    // The text-to-speech service provider
    private ttsProvider: TextToSpeechProvider = TextToSpeechProvider.WebSpeech;
    
    // The audio for high quality speech
    private currentAudio: HTMLAudioElement | undefined;
    
    // Cancel request
    private cancelRequest = false;
    
    // AbortController for in-flight server-side TTS fetches
    private currentFetchAbortController?: AbortController;
    
    // Private constructor to enforce singleton pattern
    private constructor() {
    }
    
    /**
     * Gets the singleton instance of SpeechUtil.
     * 
     * @returns The SpeechUtil singleton instance.
     */
    public static getInstance(): SpeechUtil {
        if (!SpeechUtil.instance) {
            SpeechUtil.instance = new SpeechUtil();
        }
        return SpeechUtil.instance;
    }
    
    /**
     * Initializes the SpeechSynthesis system.
     * Should be called once at application startup.
     * 
     * @param allPersonas - The personas for voice registration
     * @param ttsProvider - The text-to-speech service provider
     */
    public initSpeech(allPersonas: DBPersona[],
                      ttsProvider: TextToSpeechProvider): void {
        this.reset();
        this.ttsProvider = ttsProvider;
        
        if (ttsProvider === TextToSpeechProvider.ElevenLabs ||
            ttsProvider === TextToSpeechProvider.OpenAI) {
            this.registerPersonas(allPersonas);
        }
        else { // Web Speech API
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                console.warn('Web Speech API is not supported in this browser or environment.');
                return;
            }
            
            this.synthesis = window.speechSynthesis;
            
            // Register personas when voices are loaded
            this.synthesis.onvoiceschanged = () => {
                this.registerPersonas(allPersonas);
            };
            
            // If voices already loaded, register immediately
            if (this.synthesis.getVoices().length > 0) {
                this.registerPersonas(allPersonas);
            }
        }
    }
    
    /**
     * Sets the currentVoice to the voice associated with the given persona.
     * Should be called at the start of a speech stream for a persona.
     * 
     * @param persona The persona whose voice should be used
     */
    public initializeSpeechSynthesis(persona: DBPersona): void {
        if (this.ttsProvider !== TextToSpeechProvider.WebSpeech) {
            return; // Skip if not Web Speech API
        }
        
        // If the synthesis object isn't available, we can't do anything.
        if (!this.synthesis) {
            return;
        }
        
        // Lookup the voice from our pre-registered map.
        const selectedVoice = this.personaVoiceMap.get(persona.name);
        
        if (selectedVoice) {
            this.currentVoice = selectedVoice as SpeechSynthesisVoice;
        }
        else {
            // Fallback: If no voice is registered, use a generic English voice from the browser.
            this.currentVoice = this.synthesis.getVoices()
                                              .find(voice => voice.lang.startsWith('en-')) || null;
        }
    }
    
    /**
     * Adds a text chunk to the speech queue, buffering partial sentences,
     * and triggers speech playback for complete sentences.
     * 
     * @param text     - The text chunk to queue for speech
     * @param persona  - The persona that speaks
     * @param streamId - The identifier for the current TTS stream. 
     *                   If provided, this chunk will only be queued and played 
     *                   if the stream is still active. This ensures that chunks 
     *                   from previous or interrupted streams do not get played 
     *                   accidentally.
     */
    public queueSpeechChunk(text   : string,
                            persona: DBPersona,
                            streamId?: number): void {
        this.cancelRequest = false;
        this.textBuffer += text;
        
        if (this.ttsProvider !== TextToSpeechProvider.WebSpeech) {
            // The code that follows applies only to Web Speech API
            return;
        }
        
        // Look for sentence-ending punctuation or new lines
        const sentenceEndings = /[.?!;\n]/g;
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        
        // Find all sentence endings in the buffer
        while ((match = sentenceEndings.exec(this.textBuffer)) !== null) {
            const sentence = this.textBuffer.substring(lastIndex, match.index + 1).trim();
            if (sentence) {
                const stamp = typeof streamId === 'number' ? streamId : this.activeStreamId;
                this.speechQueue.push({ text    : sentence,
                                        persona : persona,
                                        streamId: stamp });
                this.processSpeechQueue(); // Try to speak the new chunk
            }
            lastIndex = match.index + 1;
        }
        
        // Keep the rest of the text in the buffer
        this.textBuffer = this.textBuffer.substring(lastIndex);
    }
    
    /**
     * Finalizes and queues any remaining buffered text to the speech queue.
     * Should be called after streaming text input is complete.
     * Notes:
     * - If the stream id provided (if any) does not match the active stream,
     *   it returns immediately.
     * - For server-side TTS (OpenAI/ElevenLabs) it attempts to play the
     *   buffered text but will stop early if the stream becomes stale or a
     *   cancel was requested.
     *
     * @param persona  - The persona that speaks
     * @param streamId - The stream identity used to associate this finalization
     *                   with a specific speech stream. If provided, queued speech will
     *                   only be finalized if the stream ID matches the active stream.
     */
    public async finalizeSpeechQueue(persona  : DBPersona,
                                     streamId?: number):Promise<void> {
        // If caller bound this finalization to a specific stream, ensure it's still current.
        if (typeof streamId === 'number' && streamId !== this.activeStreamId) {
            return;
        }
        
        if (this.textBuffer.trim().length === 0) {
            // Nothing to flush
            return;
        }
        
        // Capture and clear buffer early so concurrent calls can't re-use same text.
        const textToSpeak = this.textBuffer;
        this.textBuffer   = '';
        
        if (this.ttsProvider === TextToSpeechProvider.OpenAI ||
            this.ttsProvider === TextToSpeechProvider.ElevenLabs) {
            
            const playPromise = this.streamAndPlayTTSFromServer(textToSpeak, persona);
            
            const timeoutMs = 5000;
            try {
                await promiseWithTimeout(playPromise, timeoutMs, "finalizeSpeechQueue");
            }
            catch {
                // Don't throw — just log. We intentionally don't rethrow so caller can continue.
                console.warn("[SpeechUtil.finalizeSpeechQueue] server-side TTS failed or timed out:");
            }
        }
        else { // Web Speech API
            const stamp = typeof streamId === 'number' ? streamId : this.activeStreamId;
            this.speechQueue.push({ text    : this.textBuffer,
                                    persona : persona,
                                    streamId: stamp });
            this.processSpeechQueue();
        }
    }
    
    /**
     * Starts a fresh stream context for playback only:
     * - increments activeStreamId so pending utterances become stale,
     * - stops any current audio output,
     * - clears queues and buffer,
     * - DOES NOT abort currentFetchAbortController (so network reads can continue).
     *
     * @returns the new stream id
     */
    public startNewStream(): number {
        this.activeStreamId++;
        
        // Stop HTMLAudio playback if any (server-side TTS)
        try {
            this.currentAudio?.pause();
        }
        catch {}
        this.currentAudio = undefined;
        this.isSpeaking   = false;
        
        // Web Speech API stop
        try {
            this.synthesis?.cancel();
        }
        catch {}
        this.currentVoice = null;
        
        // Clear local queue and buffer (so nothing will be spoken for the old stream)
        this.speechQueue = [];
        this.textBuffer = '';
        this.cancelRequest = false;
        
        // NOTE: we DO NOT abort currentFetchAbortController here.
        return this.activeStreamId;
    }
    
    /**
     * @returns {@code true} if the provided streamId still matches the active stream.
     */
    public isStreamStillActive(streamId: number): boolean {
        return this.activeStreamId === streamId;
    }
    
    /**
     * Immediately interrupts any current playback and start a fresh stream context.
     *
     * Call this at the start of a new streaming session to ensure previous audio/text
     * is dropped and won't be played.
     * 
     * @returns the new stream id
     */
    public interruptSpeech(): number {
        // Move to a new stream id — all previously queued items become stale.
        this.activeStreamId++;
        
        // Abort any in-flight server fetch
        try {
            this.currentFetchAbortController?.abort();
        }
        catch {}
        this.currentFetchAbortController = undefined;
        
        // Cancel any ongoing playback immediately
        if (this.ttsProvider === TextToSpeechProvider.OpenAI ||
            this.ttsProvider === TextToSpeechProvider.ElevenLabs) {
            // Stop HTMLAudio playback if any
            this.currentAudio?.pause();
            this.currentAudio = undefined;
            this.isSpeaking = false;
        }
        else {
            // Web Speech API cancel
            this.synthesis?.cancel();
            this.isSpeaking = false;
            this.currentVoice = null;
        }
        
        // Clear buffers and queues so the new stream starts fresh
        this.speechQueue = [];
        this.textBuffer = '';
        this.cancelRequest = false;
        
        return this.activeStreamId;
    }
    
    /**
     * Resumes paused speech playback.
     */
    public resumeSpeech(): void {
        if (this.synthesis?.paused) { // Web Speech API
            this.synthesis.resume();
        }
    }
    
    /**
     * Stops the current speech and clears the entire speech queue.
     */
    public cancelSpeech(): void {
        this.cancelRequest = true;
        // Also abort any in-flight fetch
        try {
            this.currentFetchAbortController?.abort();
        }
        catch {}
        this.currentFetchAbortController = undefined;
        
        if (this.ttsProvider === TextToSpeechProvider.OpenAI ||
            this.ttsProvider === TextToSpeechProvider.ElevenLabs) {
            this.currentAudio?.pause();
            this.currentAudio = undefined;
            this.isSpeaking = false;
        }
        else { // Web Speech API
            this.synthesis?.cancel();
            this.speechQueue   = [];
            this.isSpeaking    = false;
            this.textBuffer    = '';
            this.currentVoice = null; // Clear the voice on cancel
        }
    }
    
    /**
     * Waits asynchronously until all queued speech has finished playing.
     * Useful for synchronization.
     */
    /**
     * Waits until the speech queue has fully finished processing, or until a
     * timeout elapses.
     *
     * This method resolves only after all queued speech has been spoken and no
     * active playback remains. If speech completes before the specified timeout,
     * the returned Promise resolves normally. If the timeout is reached while
     * speech is still in progress, the Promise rejects with a timeout error.
     *
     * @param maxWaitMs the maximum time to wait, in milliseconds, before timing
     *                  out; defaults to 5000 ms if not specified
     * 
     * @return a Promise that resolves when all speech playback has finished, or
     *         rejects if the timeout duration is exceeded
     */
    public async waitUntilSpeechFinished(maxWaitMs = 5000): Promise<void> {
        const startStreamId = this.activeStreamId;
        
        const waitPromise = new Promise<void>(async (resolve) => {
            while (true) {
                // If the stream changed, stop waiting (we don't want to block
                // for previous streams).
                if (this.activeStreamId !== startStreamId) {
                    resolve();
                    return;
                }
                
                // If nothing to speak and not currently speaking, we're done.
                if (!this.isSpeaking && this.speechQueue.length === 0) {
                    resolve();
                    return;
                }
                
                // Small delay before checking again
                await new Promise(r => setTimeout(r, 100));
            }
        });
        
        try {
            await promiseWithTimeout(waitPromise, maxWaitMs, "waitUntilSpeechFinished");
        }
        catch {
            console.warn(`[SpeechUtil.waitUntilSpeechFinished] timed out after ${maxWaitMs}ms:`);
        }
    }
    
    // ---------------------------------------------------------------------- //
    //      H   E   L   P   E   R      F   U   N   C   T   I   O   N   S      //
    // ---------------------------------------------------------------------- //
    /**
     * Resets all internal state to initial values.
     * Called during initialization to clear old state.
     */
    private reset(): void {
        // Cancel any ongoing speech to stop the current utterance.
        try { this.synthesis?.cancel(); } catch {}
        this.speechQueue      = [];
        this.isSpeaking       = false;
        this.synthesis        = null;
        this.currentVoice     = null;
        this.textBuffer       = '';
        this.personaVoiceMap.clear();
        try { this.currentAudio?.pause(); } catch {}
        this.currentAudio = undefined;
        try { this.currentFetchAbortController?.abort(); } catch {}
        this.currentFetchAbortController = undefined;
    }
    
    /**
     * Processes the next text chunk in the speech queue, speaking it aloud.
     * Called internally to manage sequential playback.
     */
    private processSpeechQueue(): void {
        if (this.isSpeaking || this.speechQueue.length === 0 || this.cancelRequest) {
            return;
        }
        
        // Skip any leading items that belong to an older stream id
        while (this.speechQueue.length > 0 && this.speechQueue[0].streamId !== this.activeStreamId) {
            // Drop stale chunk
            this.speechQueue.shift();
        }
        
        if (this.isSpeaking || this.speechQueue.length === 0 || this.cancelRequest) {
            return;
        }
        
        const item = this.speechQueue.shift();
        if (!item) {
            return;
        }
        const { text, persona, streamId } = item;
        
        // If item is stale (defensive check) skip it
        if (streamId !== this.activeStreamId) {
            // Not for this stream — process next
            this.processSpeechQueue();
            return;
        }
        
        // We will begin speaking this item — mark state now
        this.isSpeaking = true;
        
        if (this.ttsProvider === TextToSpeechProvider.OpenAI ||
            this.ttsProvider === TextToSpeechProvider.ElevenLabs) {
            // Server-side TTS: fetch/play audio. Capture the streamId so we can
            // drop the result if it becomes stale while fetching or playing.
            const myStreamId = streamId;
            
            // Server-side TTS: stream, play and then continue with next chunk only if
            // the streamId is still current and no cancel was requested.
            this.streamAndPlayTTSFromServer(text, persona)
                .catch((err) => {
                    console.error("streamAndPlayTTSFromServer error:", err);
                })
                .finally(() => {
                    this.isSpeaking = false;
                    // Only continue processing if this chunk belongs to the current stream
                    if (!this.cancelRequest && this.activeStreamId === myStreamId) {
                        this.processSpeechQueue();
                    }
                });
        }
        else { // Web Speech API
            // Create utterance and attach event handlers.
            const utterance = new SpeechSynthesisUtterance(text);
            
            if (this.currentVoice) {
                utterance.voice = this.currentVoice;
            }
            
            // Customize rate, pitch, etc. if needed
            // utterance.rate = 1.1;  // A little faster
            // utterance.pitch = 1.0; // Normal pitch
            utterance.onend = () => {
                this.isSpeaking = false;
                // Continue only if not cancelled and stream still current
                if (!this.cancelRequest && this.activeStreamId === streamId) {
                    this.processSpeechQueue();
                }
            };
            
            utterance.onerror = () => {
                this.isSpeaking = false;
                // Continue to next chunk even on error, but only if this stream is still active
                if (!this.cancelRequest && this.activeStreamId === streamId) {
                    this.processSpeechQueue();
                }
            };
            
            // If a cancel/interrupt happened between selecting the item and now, bail out.
            if (this.cancelRequest || this.activeStreamId !== streamId) {
                this.isSpeaking = false;
                return;
            }
            
            this.synthesis?.speak(utterance);
        }
    }
    
    /**
     * Registers personas with specific voices by building a lookup map.
     * This function iterates through the personas and assigns them a voice from
     * the pre-defined lists.
     * 
     * @param personas    - Array of persona objects to register voices for
     * @param highQuality - Flag to use ElevenLabs TTS (true) or Web Speech API
     *                      (false)
     */
    private registerPersonas(personas: DBPersona[]): void {
        if (this.ttsProvider === TextToSpeechProvider.OpenAI ||
            this.ttsProvider === TextToSpeechProvider.ElevenLabs) {
            const maleVoices   = this.ttsProvider === TextToSpeechProvider.OpenAI?
                                 MALE_VOICES_OPENAI_API: MALE_VOICE_IDS_ELEVENLABS_API;
            const femaleVoices = this.ttsProvider === TextToSpeechProvider.OpenAI?
                                 FEMALE_VOICES_OPENAI_API: FEMALE_VOICE_IDS_ELEVENLABS_API;
            let maleIndex   = 0;
            let femaleIndex = 0;
            for (const persona of personas) {
                // Determine which voice list to use based on gender
                if (persona.gender === Gender.MALE) {
                    const selectedVoice = maleVoices[maleIndex % maleVoices.length];
                    if (selectedVoice) {
                        this.personaVoiceMap.set(persona.name, selectedVoice);
                    }
                    maleIndex++;
                }
                else { // persona.gender === Gender.FEMALE
                    const selectedVoice = femaleVoices[femaleIndex % femaleVoices.length];
                    if (selectedVoice) {
                        this.personaVoiceMap.set(persona.name, selectedVoice);
                    }
                    femaleIndex++;
                }
            }
        }
        else { // Web Speech API
            const availableVoices = this.synthesis?.getVoices() || [];
            if (availableVoices.length === 0) {
                // No voices are available yet. Waiting for onvoiceschanged event.
                return;
            }
            
            const englishVoices = availableVoices.filter(voice => voice.lang === 'en-US');
            const maleVoices    = englishVoices.filter(voice =>
                MALE_NAMES_WEB_API.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
            );
            const femaleVoices  = englishVoices.filter(voice =>
                FEMALE_NAMES_WEB_API.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
            );
            
            let maleIndex   = 0;
            let femaleIndex = 0;
            for (const persona of personas) {
                // Determine which voice list to use based on gender
                if (persona.gender === Gender.MALE) {
                    const selectedVoice = maleVoices[maleIndex % maleVoices.length];
                    if (selectedVoice) {
                        this.personaVoiceMap.set(persona.name, selectedVoice);
                    }
                    maleIndex++;
                }
                else { // persona.gender === Gender.FEMALE
                    const selectedVoice = femaleVoices[femaleIndex % femaleVoices.length];
                    if (selectedVoice) {
                        this.personaVoiceMap.set(persona.name, selectedVoice);
                    }
                    femaleIndex++;
                }
            }
        }
    }
    
    /**
     * Sends text to the server-side TTS API and plays the streamed audio response.
     *
     * @param text    - The text to convert and play
     * @param persona - The persona that speaks
     */
    private async streamAndPlayTTSFromServer(text   : string,
                                             persona: DBPersona): Promise<void> {
        const myStreamId = this.activeStreamId; // Capture stream identity
        const useOpenAI = this.ttsProvider === TextToSpeechProvider.OpenAI;
        const url = useOpenAI ? 'https://api.openai.com/v1/audio/speech' : '/api/textToSpeech';
        const body = useOpenAI?
                     JSON.stringify({
                         model: "tts-1",
                         voice: this.personaVoiceMap.get(persona.name),
                         input: text,
                         response_format: RESPONSE_AUDIO_FORMAT
                     }) :
                     JSON.stringify({
                        text   : text,
                        voiceId: this.personaVoiceMap.get(persona.name)??
                                 DEFAULT_VOICE_ID_ELEVEN_LABS_API
                     });
        const headers = {
            'Content-Type': 'application/json',
            ...(useOpenAI && { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY!}` })
        };
        
        // Create & store an AbortController so we can cancel this request if interrupted
        const controller = new AbortController();
        this.currentFetchAbortController = controller;
        
        let response: Response;
        try{
            response = await fetch(url, {
                method : 'POST',
                headers: headers,
                body   : body,
                signal : controller.signal
            });
        }
        catch {
            // Fetch failed (maybe aborted) — treat as a no-op
            if (this.currentFetchAbortController === controller) {
                this.currentFetchAbortController = undefined;
            }
            return;
        }
        
        if (!response.ok || !response.body) {
            if (this.currentFetchAbortController === controller) {
                this.currentFetchAbortController = undefined;
            }
            throw new Error(`TTS request failed: ${response.statusText}`);
        }
        
        // Read the stream, collect all chunks, and play the full audio
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    chunks.push(value);
                }
                
                // Early cancellation check during streaming
                if (myStreamId !== this.activeStreamId || this.cancelRequest) {
                    // Try to cancel the reader to stop network activity
                    try { await reader.cancel(); } catch {}
                    return;
                }
            }
        }
        finally {
            // Ensure we clear the controller if it still corresponds to this fetch
            if (this.currentFetchAbortController === controller) {
                this.currentFetchAbortController = undefined;
            }
            
            try { reader.releaseLock(); } catch {}
        }
        
        // If stream became stale while fetching, drop audio
        if (myStreamId !== this.activeStreamId || this.cancelRequest) {
            return;
        }
        
        // Merge chunks into one contiguous buffer
        const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
        if (totalLength === 0) {
            return;
        }
        
        const audioBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            audioBuffer.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Guard again right before playback
        if (myStreamId !== this.activeStreamId || this.cancelRequest) {
            return;
        }
        
        // Play audio (errors are surfaced to caller of streamAndPlayTTSFromServer via reject)
        try {
            await this.playAudio(audioBuffer);
        } catch {
            // Swallowing playback error to avoid bubbling — caller/processSpeechQueue handles continuation
        }
    }
    
    /**
     * Plays a given audio buffer using HTMLAudioElement.
     *
     * @param audioBuffer - The audio data to play
     */
    private playAudio(audioBuffer: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            // Cancel any currently playing audio
            if (this.currentAudio) {
                try {
                    this.currentAudio.pause();
                    this.currentAudio.currentTime = 0;
                }
                catch {}
                this.currentAudio = undefined;
                this.isSpeaking = false;
            }
            
            let blob: Blob;
            if (RESPONSE_AUDIO_FORMAT === 'pcm') {
                        // Convert raw PCM to WAV
                const wavBuffer = this.pcmToWav(audioBuffer, {
                                                    numChannels: 1,
                                                    sampleRate : 24000,
                                                    bitDepth   : 16
                                                });
                // Ensure the chunk is backed by a real ArrayBuffer (not SharedArrayBuffer)
                const safeWav = new Uint8Array(wavBuffer); // copies data if necessary
                blob = new Blob([safeWav], { type: 'audio/wav' });
            }
            else {
                // Ensure a proper ArrayBufferView backed by plain ArrayBuffer
                const safeAudio = new Uint8Array(audioBuffer); // copies data if necessary
                blob = new Blob([safeAudio], { type: 'audio/mpeg' });
            }
            const url = URL.createObjectURL(blob);
    
            const audio = new Audio(url);
            this.currentAudio = audio;
            this.isSpeaking = true;
    
            audio.onended = () => {
                this.isSpeaking = false;
                URL.revokeObjectURL(url);
                resolve();
            };
    
            audio.onerror = (error) => {
                console.error("Audio error:", error);
                this.isSpeaking = false;
                URL.revokeObjectURL(url);
                reject(error);
            };
            
            audio.play()
                 .catch(err => {
                     console.error("Playback failed:", err);
                     this.isSpeaking = false;
                     URL.revokeObjectURL(url);
                     reject(err);
                 });
        });
    }
    
    /**
     * Converts raw PCM audio data into a WAV-formatted Uint8Array buffer.
     * This enables playback of uncompressed audio data in browsers using the Audio element.
     *
     * @param pcm                 - The raw PCM audio data as a Uint8Array (typically 16-bit
     *                              little-endian mono)
     * @param options             - Configuration options for WAV encoding
     * @param options.numChannels - Number of audio channels (e.g. 1 for mono, 2 for stereo)
     * @param options.sampleRate  - The sample rate in Hz (e.g. 24000 or 44100)
     * @param options.bitDepth    - Number of bits per sample (typically 16)
     * 
     * @returns a Uint8Array representing the complete WAV audio file with header and data
     */
    private pcmToWav(pcm    : Uint8Array,
                     options: {
                         numChannels: number,
                         sampleRate : number,
                         bitDepth   : number
                     }): Uint8Array {
        const { numChannels, sampleRate, bitDepth } = options;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const wavHeaderSize = 44;
        const dataSize = pcm.length;
        
        const buffer = new ArrayBuffer(wavHeaderSize + dataSize);
        const view = new DataView(buffer);
        
        // Write WAV header
        this.writeString(view, 0, 'RIFF');                   // ChunkID
        view.setUint32(4, 36 + dataSize, true);              // ChunkSize
        this.writeString(view, 8, 'WAVE');                   // Format
        this.writeString(view, 12, 'fmt ');                  // Subchunk1ID
        view.setUint32(16, 16, true);                        // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true);                         // AudioFormat (1 = PCM)
        view.setUint16(22, numChannels, true);               // NumChannels
        view.setUint32(24, sampleRate, true);                // SampleRate
        view.setUint32(28, byteRate, true);                  // ByteRate
        view.setUint16(32, blockAlign, true);                // BlockAlign
        view.setUint16(34, bitDepth, true);                  // BitsPerSample
        this.writeString(view, 36, 'data');                  // Subchunk2ID
        view.setUint32(40, dataSize, true);                  // Subchunk2Size
        
        // Write audio data
        new Uint8Array(buffer, wavHeaderSize).set(pcm);
        
        return new Uint8Array(buffer);
    }
    
    /**
     * Writes a string into a DataView at the specified byte offset.
     *
     * @param view   The DataView to write into.
     * @param offset The byte offset at which to begin writing the string.
     * @param str    The string to write. Each character is encoded as a single byte.
     */
    private writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
}

