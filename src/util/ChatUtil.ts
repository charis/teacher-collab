// Custom imports
import { selectBestPersona } from "@/util/PersonaUtil";
import { isFixedAgentMode } from "@/util/SettingsUtil";
import { SpeechUtil } from "@/util/SpeechUtil";
import { promiseWithTimeout } from "@/util/utils";
import { CachedDBPersona,
         ChatMessage,
         DBPersona,
         DBProblem,
         DBTranscript,
         Role,
         Settings } from "@/types";
import { MIN_INTERACTIONS } from "@/constants";
import { parseDrawCommands, commandsToElements } from "@/util/WhiteboardUtil";

/**
 * If `true`, we use sentences for text-to-speech conversion. In other words,
 * each TTS request asks to covert a sentence to audio.
 * If `false`, we use chunks of text (typically 1 or 2 words). In other words,
 * each TTS request asks to covert 1-2 words to audio (hence we need more TTS
 * requests).
 */
const USE_SENTENCES_FOR_TTS = true;

/**
 * Generates a unique integer ID based on the current timestamp.
 *
 * This function returns the number of milliseconds elapsed since
 * January 1, 1970 00:00:00 UTC (Unix epoch). The returned value can be used as
 * a unique identifier for timestamping or ordering records chronologically.
 *
 * @returns {number} the current timestamp in milliseconds
 */
export function generateId(): number {
    return Date.now();
}

/**
 * Formats a title from message text.
 * 
 * @param {string} text - Message text to format as title
 * 
 * @returns truncated string suitable for use as a title
 */
export function getTitle(text: string): string {
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
}


/**
 * Sends a user message to the OpenAI backend and streams the assistant's response.
 * Handles persona selection, message state management, and database persistence.
 *
 * @param message            - The user message to send
 * @param settings           - The settings state used by the client application
 * @param persona            - The persona that is selected to respond to the user message or
 *                             {@code null} to select one automatically
 * @param agentId            - The ID of the selected agent in meet-with-agent chats, or
 *                             {@code null} if no agent is selected
 * @param problem            - The problem statement including agent notes or
 *                             {@code null} in meet-with-agent chats
 * @param transcript         - The student transcript including agent notes
 * @param messages           - The current array of messages in the conversation
 * @param setMessages        - React state updater to modify the local message list
 * @param saveMessage        - Function to persist a message to the backend
 * @param setResponseMessage - Function to update the streaming assistant message
 * @param saveUserMessage    - {@code true} to save the user message to the database or
 *                             {@code false} if the message has already been saved (e.g.,
 *                             by an upstream call to {@link saveMessage()}).
 * @param embeddedPersonas   - The available persona definitions to select from
 */
export async function sendMessageWithStreaming(
    message           : ChatMessage,
    settings          : Settings | null,
    persona           : DBPersona | null,
    agentId           : string | null,
    problem           : DBProblem | null,
    transcript        : DBTranscript | null,
    messages          : ChatMessage[],
    setMessages       : React.Dispatch<React.SetStateAction<
                                             Record<number | string, ChatMessage[]>>
                        >,
    saveMessage       : (message            : ChatMessage,
                         problemId          : string | null,
                         transcriptOrAgentId: number | string) => Promise<void>,
    setResponseMessage: (message            : ChatMessage,
                         transcriptOrAgentId: number | string,
                         text               : string | null) => void,
    saveUserMessage   : boolean,
    embeddedPersonas  : CachedDBPersona[],
    chatId?           : number
  ): Promise<void> {
    const oneOnOneWithSingleAgent = agentId !== null;
    const transcriptOrAgentId = oneOnOneWithSingleAgent ? agentId : transcript!.id;
    
    const speechUtil = SpeechUtil.getInstance();
    
    try {
        // Append message to the active chat messages
        const newMessages = [...messages, message];
        setMessages(prev => ({
            ...prev,
            [transcriptOrAgentId]: newMessages
        }));
        
        // Save user message in the database
        if (saveUserMessage) {
            await saveMessage(message,
                              oneOnOneWithSingleAgent? null : problem!.problemId,
                              transcriptOrAgentId);
        }
       
        // Persona selection
        const numOfAgents = embeddedPersonas.length;
        
        // Note: For now, if there are multiple agents we get one response (from
        //        one of the agents) only, but in the future this may change
        const numOfAgentResponsesWhenMultipleAgents = 1;
        const numOfAgentResponses = oneOnOneWithSingleAgent?
                                    1 : numOfAgentResponsesWhenMultipleAgents;
        
        // Track personas already used
        const usedPersonaIds  = new Set<string>();
        let remainingPersonas = [...embeddedPersonas];
        const messagesSoFar   = [message.text];
        
        // Before multi-agent loop (or once per new message)
        speechUtil.cancelSpeech();
        
        let existsOutroMessage    = false;
        let currIndex             = -1;
        let indexAfterNextMessage = -1;
        
        if (isFixedAgentMode(settings) && !oneOnOneWithSingleAgent) {
            const userMessageCount = messages.filter(msg => msg.role === Role.USER).length + 1;
            // Current persona index
            currIndex = Math.min(Math.floor((userMessageCount - 1)/ MIN_INTERACTIONS),
                                 numOfAgents - 1);
            // Persona index after the next user message
            indexAfterNextMessage = Math.min(Math.floor(userMessageCount / MIN_INTERACTIONS),
                                             numOfAgents - 1);
            const minInteractions = numOfAgents > 1 ?
                                    (numOfAgents + 1) * MIN_INTERACTIONS : MIN_INTERACTIONS;
            // The last MIN_INTERACTIONS involve all personas
            if (minInteractions - userMessageCount === MIN_INTERACTIONS) {
                existsOutroMessage = true;
                indexAfterNextMessage = -1;
            }
            else if (currIndex != indexAfterNextMessage) {
                existsOutroMessage = true;
            }
        }
        
        if (existsOutroMessage && !oneOnOneWithSingleAgent) {
            const nextPersona = indexAfterNextMessage == -1?
                                null : embeddedPersonas[indexAfterNextMessage];
            await outroMessage(embeddedPersonas[currIndex],
                               nextPersona,
                               problem!.problemId,
                               transcript!.id,
                               newMessages,
                               setMessages,
                               saveMessage,
                               settings?.speech ? speechUtil : null);
            if (nextPersona != null) {
                return;
            }
        }
        
        for (let i = 0; i < numOfAgentResponses; i++) {
            let selectedPersona: DBPersona | null = null;
            if (oneOnOneWithSingleAgent) {
                const match = embeddedPersonas.find(p => p.personaId === agentId);
                if (!match) {
                     throw new Error(`Agent ${agentId} not found`);
                }
                selectedPersona = match;
            }
            else {
                if (isFixedAgentMode(settings)) {
                    // Select a persona to interact one-on-one with the user based on
                    // the number of interactions (user messages so far). If null,
                    // we will pick later the best persona.
                    selectedPersona = selectPersona(messages, embeddedPersonas);
                }
                if (selectedPersona === null) {
                    selectedPersona = (i === 0 && persona)?
                                      persona :
                                      await selectBestPersona(messagesSoFar, remainingPersonas);
                }
                
                usedPersonaIds.add(selectedPersona.personaId);
                remainingPersonas = remainingPersonas.filter(p => !usedPersonaIds.has(p.personaId));
            }
            
            // Build system context from global instructions, image descriptions,
            // and agent notes
            let systemContext = '';

            const globalInstructions = settings?.global_instructions?.trim() || '';
            if (globalInstructions) {
                systemContext += globalInstructions;
            }

            if (!oneOnOneWithSingleAgent && problem) {
                let problemImageDesc = problem.imageDescription?.trim() || '';
                if (!problemImageDesc && problem.imageURL) {
                    problemImageDesc = await fetchImageDescription('problem', problem.problemId);
                }
                if (problemImageDesc) {
                    systemContext += `\n\nThe problem includes an image: ${problemImageDesc}`;
                }
                if (problem.agentNotes?.trim()) {
                    systemContext += `\n\nAgent notes for this problem: ${problem.agentNotes}`;
                }
            }

            if (!oneOnOneWithSingleAgent && transcript) {
                let transcriptImageDesc = transcript.imageDescription?.trim() || '';
                if (!transcriptImageDesc && transcript.imageURL) {
                    transcriptImageDesc = await fetchImageDescription('transcript',
                                                                      String(transcript.id));
                }
                if (transcriptImageDesc) {
                    systemContext += `\n\nThe student's work includes an image: ${transcriptImageDesc}`;
                }
                if (transcript.agentNotes?.trim()) {
                    systemContext += `\n\nAgent notes for this transcript: ${transcript.agentNotes}`;
                }
            }

            const systemMessage: ChatMessage | null = systemContext.trim()
                ? {
                    id       : 1,
                    role     : Role.SYSTEM,
                    personaId: null,
                    name     : null,
                    text     : systemContext.trim()
                }
                : null;

            const messagesIncludingSystemPrompt: ChatMessage[] = [
                ...(systemMessage ? [systemMessage] : []),
                ...annotateMessages(newMessages, numOfAgents, settings),
            ];
            
            // Send request
            const response = await fetch('/api/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: messagesIncludingSystemPrompt }),
            });
            
            if (!response.ok || !response.body) {
                throw new Error('No stream available');
            }
            
            // Create response shell
            const responseId = generateId();
            const responseMessage: ChatMessage = {
                id       : responseId,
                role     : Role.ASSISTANT, // This is a response from the bot
                personaId: selectedPersona.personaId,
                name     : selectedPersona.name,
                text     : '' // Initially the content is empty
                              // Later will append the stream from the bot
            };
            
            setResponseMessage(responseMessage,
                               transcriptOrAgentId,
                               null);
            
            // Decode the stream (response)
            const reader = response.body.getReader();
            const textDecoder = new TextDecoder();
            
            let responseText = '';

            if (settings?.speech) {
                // streamAndPlayAudio is expected to:
                // - initialize the voice for persona,
                // - queue chunks/sentences, finalize and wait for playback,
                // - invoke the onChunk callback with each decoded chunk for UI updates.
                try {
                    await streamAndPlayAudio(reader,
                                             textDecoder,
                                             selectedPersona,
                                             (chunkText: string) => {
                                                 responseText += chunkText;
                                                 setResponseMessage(responseMessage,
                                                                    transcriptOrAgentId,
                                                                    responseText);
                                             }
                    );
                }
                catch {
                    // Do nothing
                }
            }
            else {
                try {
                    // No TTS: decode the stream, append to responseText and update UI as chunks arrive.
                    let done = false;
                    while (!done) {
                        const { value, done: doneReading } = await reader.read();
                        done = doneReading;
                        const chunkText = value ? textDecoder.decode(value, { stream: true }) : '';
                        if (chunkText.length > 0) {
                            responseText += chunkText;
                            setResponseMessage(responseMessage, transcriptOrAgentId, responseText);
                        }
                    }
                }
                catch {
                    // Do nothing
                }
            }

            // Save assistant message (i.e., response) in the database
            const chatMessage = {
                id       : responseMessage.id,
                role     : Role.ASSISTANT,
                personaId: selectedPersona.personaId,
                name     : selectedPersona.name,
                text     : responseText,
            };
            await saveMessage(chatMessage,
                              problem?.problemId ?? null,
                              transcriptOrAgentId);

            // Check if the AI response contains whiteboard draw commands
            if (chatId && typeof transcriptOrAgentId === 'number') {
                const commands = parseDrawCommands(responseText);
                if (commands && commands.length > 0) {
                    const elements = commandsToElements(commands);
                    fetch('/api/whiteboard/draw', {
                        method : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body   : JSON.stringify({
                            chatId,
                            transcriptId: transcriptOrAgentId,
                            elements
                        })
                    }).catch(err => console.error('[ChatUtil] Whiteboard draw failed:', err));
                }
            }
        }
    }
    catch (error) {
        console.error(error);
        setMessages(prevMessages => ({
            ...prevMessages,
            [transcriptOrAgentId]: (prevMessages[transcriptOrAgentId] || []).filter(
                                                                    msg => msg.id !== message.id
                                                                )
        }));
    }
}

// -------------------------------------------------------------------------- //
//        H   E   L   P   E   R      F   U   N   C   T   I   O   N   S        //
// -------------------------------------------------------------------------- //
/**
 * Reads the response stream, invokes `onChunk` for each decoded chunk so the
 * caller can append and update UI, and handles TTS queuing/finalization.
 *
 * IMPORTANT: This function assumes you only call it when speech playback is enabled.
 *
 * @param reader      - ReadableStreamDefaultReader<Uint8Array> from fetch response
 * @param textDecoder - TextDecoder to decode Uint8Array chunks
 * @param persona     - Persona whose voice will be used
 * @param onChunk     - Callback invoked with each decoded chunk of text
 */
async function streamAndPlayAudio(reader     :  ReadableStreamDefaultReader<Uint8Array>,
                                  textDecoder: TextDecoder,
                                  persona    : DBPersona,
                                  onChunk    : (chunkText: string) => void): Promise<void> {
    const speechUtil = SpeechUtil.getInstance();
    
    // Start a fresh stream id and stop any playing audio, but DO NOT abort server fetches.
    // This keeps the incoming response stream intact so we can still accumulate full text.
    const streamId = speechUtil.startNewStream();
    
    // Initialize voice/SS settings for this persona
    speechUtil.initializeSpeechSynthesis(persona);
    
    let done = false;
    let sentenceBuffer = '';
    
    try {
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            // Guard against 'value' being undefined when doneReading is true
            const chunkText = value ? textDecoder.decode(value, { stream: true }) : '';
            
            // Append to the sentence buffer so UI/DB gets the full text
            sentenceBuffer += chunkText;
            
            // Check whether the stream is still the active playback stream.
            const streamStillActive = speechUtil.isStreamStillActive(streamId);
            
            // If using sentence-based TTS, accumulate and split by sentence endings,
            // queue complete sentences and keep the possibly partial last sentence in buffer.
            if (USE_SENTENCES_FOR_TTS) {
                // If still active, split and queue complete sentences for speaking.
                if (streamStillActive) {
                    const sentences = splitIntoSentences(sentenceBuffer);
                    
                    if (sentences.length > 1) {
                        for (let i = 0; i < sentences.length - 1; i++) {
                            speechUtil.queueSpeechChunk(sentences[i], persona, streamId);
                        }
                        // keep last (possibly incomplete) sentence in buffer
                        sentenceBuffer = sentences[sentences.length - 1];
                    }
                }
            }
            else {
                if (chunkText.length > 0) {
                    speechUtil.queueSpeechChunk(chunkText, persona, streamId);
                }
            }
            
            // Let the caller append/display the chunk
            if (chunkText.length > 0) {
                onChunk(chunkText);
            }
        }
    }
    catch {
        // Do nothing
    }
    
    // Decide whether we should finalize & wait:
    // Only do that if the stream is still the active playback stream.
    const streamStillActiveAfterLoop = speechUtil.isStreamStillActive(streamId);
    if (!streamStillActiveAfterLoop) {
        try {
            reader.releaseLock();
        }
        catch {
            // Do nothing
        }
        return;
    }
    
    // Flush any remaining sentence and finalize playback
    if (USE_SENTENCES_FOR_TTS && sentenceBuffer.trim().length > 0) {
        speechUtil.queueSpeechChunk(sentenceBuffer, persona, streamId);
        sentenceBuffer = '';
    }
    
    try {
        try {
            await promiseWithTimeout(speechUtil.finalizeSpeechQueue(persona, streamId),
                                     2000, // 2 seconds for finalize
                                     "finalize");
        }
        catch {
            // Do nothing
        }
        
        // Only wait for audio finish if this stream is still active (defensive)
        if (speechUtil.isStreamStillActive(streamId)) {
            try {
                await promiseWithTimeout(speechUtil.waitUntilSpeechFinished(),
                                         10000, // 10 seconds for audio finish
                                         "waitUntilSpeechFinished");
            }
            catch {
                // Do nothing
            }
        }
    }
    catch {
        // Do nothing
    }
}

/**
 * Delivers an outro message by the current persona.
 * If {@code nextPersona} is not {@code null}, that persona introduces themselves.
 *
 * @param persona      - The persona delivering the outro message
 * @param nextPersona  - The persona that will take over or {@code null} to
 *                       include all personas in the conversation
 * @param problemId    - The problem ID
 * @param transcriptId - The transcript ID
 * @param messages     - The current array of messages in the conversation
 * @param setMessages  - React state updater to modify the local message list
 * @param saveMessage  - Function to persist a message to the backend
 * @param speechUtil   - The utility for audio playback, or {@code null} if there is
 *                       no audio
 */
async function outroMessage(persona     : DBPersona,
                            nextPersona : DBPersona | null,
                            problemId   : string,
                            transcriptId: number,
                            messages    : ChatMessage[],
                            setMessages : React.Dispatch<
                                React.SetStateAction<Record<number, ChatMessage[]>>
                            >,
                            saveMessage : (message     : ChatMessage,
                                           problemId   : string,
                                           transcriptId: number) => Promise<void>,
                            speechUtil  : SpeechUtil | null) {
    const outroText = nextPersona !== null?
                      "It's time to chat with my colleague, " + nextPersona.name
                    + ". It was great to talk to you. We'll chat again soon." :
                      "Let's invite all my colleagues back into the conversation."
    const messageId = generateId();
    const outroMessage: ChatMessage = {
        id       : messageId,
        role     : Role.ASSISTANT, // This is a response from the bot
        personaId: persona.personaId,
        name     : persona.name,
        text     : outroText
    };
    
    let newMessages: ChatMessage[];
    let introMessage: ChatMessage | null = null;
    let introMessageText: string | null;
    if (nextPersona !== null) {
        introMessageText = nextPersona.description + " " + nextPersona.initialMessage;
        introMessage = {
            id       : messageId + 1,
            role     : Role.ASSISTANT, // This is a response from the bot
            personaId: nextPersona.personaId,
            name     : nextPersona.name,
            text     : introMessageText
        };
        // Append outro + intro messages to the active chat messages
        newMessages = [...messages, outroMessage, introMessage];
    }
    else {
        // Append outro message to the active chat messages
        newMessages = [...messages, outroMessage];
    }
    setMessages(prev => ({
            ...prev,
            [transcriptId]: newMessages
    }));
    
    if (speechUtil !== null) {
        // No need to split the message to sentences b/c the outro message is short
        speechUtil.queueSpeechChunk(outroText, persona);
        await speechUtil.finalizeSpeechQueue(persona);
        
        if (nextPersona != null) {
            speechUtil.queueSpeechChunk(introMessageText!, nextPersona);
            await speechUtil.finalizeSpeechQueue(nextPersona);
        }
    }
    
    await saveMessage(outroMessage, problemId, transcriptId);
    if (introMessage !== null) {
        await saveMessage(introMessage, problemId, transcriptId);
    }
}

/**
 * Selects a single persona to participate in the conversation, or {@code null}
 * if no single-persona selection should be used (the system will select the bast
 * available persona).
 *
 * @param messages - Array of chat messages
 * @param personas - Array of cached personas
 * 
 * @returns a single CachedDBPersona to use, or {@code null} when no single-persona is selected
 */
function selectPersona(messages: ChatMessage[],
                       personas: CachedDBPersona[]): CachedDBPersona | null {
    if (!personas || personas.length === 0) {
        return null;
    }
    
    const userMessageCount = messages.filter(msg => msg.role === Role.USER).length + 1;
    const minInteractions = (personas.length + 1) * MIN_INTERACTIONS;
    // The last MIN_INTERACTIONS involve all personas, return null to pick automatically
    if (minInteractions - userMessageCount <= MIN_INTERACTIONS) {
        return null;
    }
    
    const index = Math.min(Math.floor((userMessageCount - 1)/ MIN_INTERACTIONS),
                           personas.length - 1);
    return personas[index];
}

/**
 * Annotates an array of ChatMessage objects based on the given multiagent mode.
 * If `isMultiagentMode` is true, then for each assistant message (`role === Role.ASSISTANT`),
 * it prepends the message's `name` to its `text` in the format: `name: text`.
 *
 * @param messages    - The array of ChatMessage objects
 * @param numOfAgents - The number of agents
 * 
 * @returns a new array with modified messages based on the logic above.
 */
function annotateMessages(messages   : ChatMessage[],
                          numOfAgents: number,
                          settings   : Settings | null): ChatMessage[] {
    // Skip annotation when there's only one agent (no ambiguity about who
    // is speaking) OR in "Most Relevant Agent" mode — in that mode a single
    // best-fit agent is chosen per turn and embedding "<Name>:" into history
    // causes the LLM to echo the pattern (sometimes with the wrong name).
    if (numOfAgents <= 1 || !isFixedAgentMode(settings)) {
        return messages;
    }

    if (messages.length === 0) {
        return [];
    }

    const updatedMessages = messages.map((msg) => {
        const annotatedMessage = { ...msg };
        if (annotatedMessage.role === Role.ASSISTANT) {
            annotatedMessage.text = `${annotatedMessage.name}: ${annotatedMessage.text}`;
        }
        return annotatedMessage;
    });

    return updatedMessages;
}

/**
 * Splits a paragraph of text into individual sentences.
 * 
 * @param text - The full paragraph or chunk of text
 * 
 * @returns an array of sentence strings
 */
/**
 * **Fallback for the prefetch-on-render pattern.**
 *
 * Image descriptions are normally prefetched in {@link MainWindow} when
 * the problem/transcript is first displayed (fire-and-forget). By the time
 * the user sends a message, the description is usually already cached in the
 * DB.
 *
 * This function acts as a safety net: if the prefetch hasn't completed yet
 * (e.g., the user typed very quickly), it calls the same lazy endpoint which
 * either returns the now-cached description or generates one on the spot via
 * GPT-4o vision (~2-3 s one-time cost) and saves it to the DB for next time.
 *
 * @param type - {@code 'problem'} or {@code 'transcript'}
 * @param id   - The problem ID (string) or transcript ID (number as string)
 *
 * @returns the image description, or an empty string on failure
 */
async function fetchImageDescription(type: 'problem' | 'transcript',
                                     id: string): Promise<string> {
    try {
        const res = await fetch(`/api/imageDescription?type=${type}&id=${encodeURIComponent(id)}`);
        if (!res.ok) return '';
        const { description } = await res.json();
        return description ?? '';
    }
    catch {
        return '';
    }
}

function splitIntoSentences(text: string): string[] {
    const sentenceEndings = /(?<=[.?!;])\s+/g;
    
    return text.split(sentenceEndings)
               .map((sentence) => sentence.trim())
               .filter((sentence) => sentence.length > 0);
}