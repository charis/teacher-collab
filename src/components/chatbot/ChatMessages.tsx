"use client";

// Library inputs
import { HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Edit, RefreshCw, Trash2, X} from 'lucide-react';
// Custom imports
import MarkdownBlock from "@/components/chatbot/MarkdownBlock";
import { sendMessageWithStreaming } from "@/util/ChatUtil";
import { selectBestPersona } from "@/util/PersonaUtil";
import { SpeechUtil } from "@/util/SpeechUtil";
import { cn } from "@/util/utils";
import { CachedDBPersona,
         ChatMessage,
         DBPersona,
         DBProblem,
         DBTranscript,
         Gender,
         Role,
         Settings } from "@/types";
import { AvatarComponent,
         FemaleAvatars,
         MaleAvatars,
         UserAvatar } from "@/icons/Personas";

interface ChatMessagesProps extends HTMLAttributes<HTMLDivElement> {
    username            : string | null;
    settings            : Settings | null;
    chatId              : number;
    activeAgentId       : string | null;
    currProblem         : DBProblem | null;
    currTranscript      : DBTranscript | null;
    messages            : ChatMessage[];
    setMessages         : React.Dispatch<React.SetStateAction<
                                               Record<number | string, ChatMessage[]>>>;
    updateMessages      : (updatedMessages: ChatMessage[],
                           problemId          : string | null,
                           transcriptOrAgentId: number | string,
                           text               : string | null) => Promise<void>;
    saveMessage         : (message            : ChatMessage,
                           problemId          : string | null,
                           transcriptOrAgentId: number | string,) => Promise<void>;
    setResponseMessage  : (message            : ChatMessage,
                           transcriptOrAgentId: number | string,
                           text               : string | null) => void;
    currEmbeddedPersonas: CachedDBPersona[]; 
};

export function ChatMessages({ className,
                               username,
                               settings,
                               chatId,
                               activeAgentId,
                               currProblem,
                               currTranscript,
                               messages,
                               setMessages,
                               updateMessages,
                               saveMessage,
                               setResponseMessage,
                               currEmbeddedPersonas,
                               ...props }: ChatMessagesProps) {
    // -----------------------   C O N S T A N T S   ------------------------ //
    // Pixel threshold to decide if the user is "close enough" to the bottom
    const SCROLL_THRESHOLD = 120;
    
    // ---------------------------   S T A T E   ---------------------------- //
    // id of the message currently being edited
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    // Content of the message being edited
    const [editContent,      setEditContent]      = useState<string>('');
    // Messages visible in the UI (chronological: oldest -> newest)
    const [visibleMessages,  setVisibleMessages]  = useState<ChatMessage[]>([]);
    // Indicates wether the user is near the bottom of the chat
    const [isUserAtBottom,   setIsUserAtBottom]   = useState<boolean>(true);

    // ----------------------------   R E F S   ----------------------------- //
    // Scroll container DOM element
    const containerRef         = useRef<HTMLDivElement | null>(null);
    // Flag to ignore scroll events during programmatic scrolls
    const isAutoScrollingRef   = useRef<boolean>(false);
    // Timeout id that ends the auto-scroll ignore window
    const autoScrollTimeoutRef = useRef<number | null>(null);
    // Marker indicating the user just sent a message
    const userJustSentRef      = useRef<boolean>(false);

    // ---------------------------   M E M O S   ---------------------------- //
    // Lookup tables mapping personaId to Avatar component and persona data for quick access
    const { avatarMap, personaMap, introMessagesOnly } = useMemo(() => {
        const avatarMap : Record<string, AvatarComponent> = {};
        const personaMap: Record<string, CachedDBPersona> = {};
        
        let femaleIndex = 0;
        let maleIndex   = 0;
        
        for (const persona of currEmbeddedPersonas) {
            personaMap[persona.personaId] = persona;
            
            if (persona.gender === Gender.FEMALE) {
                avatarMap[persona.personaId] = FemaleAvatars[femaleIndex % FemaleAvatars.length];
                femaleIndex++;
            }
            else if (persona.gender === Gender.MALE) {
                avatarMap[persona.personaId] = MaleAvatars[maleIndex % MaleAvatars.length];
                maleIndex++;
            }
        }
        
        // Check if there is any message with the role of a user.
        const hasUserMessage = messages.some(message => message.role === Role.USER);
        
        return {
            avatarMap,
            personaMap,
            introMessagesOnly: !hasUserMessage
        };
    }, [currEmbeddedPersonas, messages]);
    
    // ------------------------- Scrolling Utilities ------------------------ //
    /**
     * Scroll to bottom safely.
     * - `behavior = "auto"` uses an instant jump (recommended during streaming/rapid updates)
     * - `options.immediate` uses a double rAF to allow React to paint newly-added DOM
     *    before measuring.
     */
    const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto",
                                        options?: { immediate?: boolean }) => {
        const refElement = containerRef.current;
        if (!refElement) {
            return;
        }
        
        if (options?.immediate) {
            // Double rArequestAnimationFrameF to ensure DOM has rendered
            // before measuring scrollHeight
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    startAutoScrollWindow();
                    refElement.scrollTop = refElement.scrollHeight;
                });
            });
            
            return;
        }
        
        // Normal case: defer to next paint and jump/scroll
        startAutoScrollWindow();
        requestAnimationFrame(() => {
            if (behavior === "auto") {
                refElement.scrollTop = refElement.scrollHeight;
            }
            else {
                refElement.scrollTo({ top: refElement.scrollHeight, behavior });
            }
        });
    }, []);
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    // Scroll Listener
    useEffect(() => {
        const refElement = containerRef.current;
        if (!refElement) {
             return;
        }
        
        // onScroll handler: update isUserAtBottom unless we're in an auto-scroll window
        const onScroll = () => {
            // Ignore scroll events while we are programmatically scrolling
            if (isAutoScrollingRef.current) {
                return;
            }
            const distanceFromBottom =
                  refElement.scrollHeight - refElement.clientHeight - refElement.scrollTop;
            setIsUserAtBottom(distanceFromBottom < SCROLL_THRESHOLD);
        };
        
        // Initialize and attach
        onScroll();
        refElement.addEventListener("scroll", onScroll, { passive: true });
        
        return () => {
            refElement.removeEventListener("scroll", onScroll);
        }
    }, []);
    
    // Auto-scroll Behavior
    /**
     * Auto-scroll policy:
     * - If the newest visible message is from the user, force an immediate
     *   jump-to-bottom (double requestAnimationFrame), and mark user-as-bottom
     *   so subsequent assistant streaming doesn't fight the browser.
     * - Otherwise, only auto-scroll if the user was already at bottom.
     *
     * Note: We use visibleMessages.length as dependency to avoid retriggering
     *       on internal object changes.
     */
    useEffect(() => {
        if (visibleMessages.length === 0) {
            return;
        }
        
        const newestMessage = visibleMessages[visibleMessages.length - 1];
        
        // If the user just posted a message, always jump to bottom.
        if (newestMessage.role === Role.USER) {
            // Mark that the user just sent a message
            userJustSentRef.current = true;
            
            // Instant jump is less janky while streaming / rapid updates
            scrollToBottom("auto", { immediate: true });
            
            // Also set the boolean state so subsequent streaming assistant updates respect it
            setIsUserAtBottom(true);
            return;
        }
        
        // For non-user messages, respect whether the user is at the bottom already
        if (isUserAtBottom) {
            scrollToBottom("auto");
        }
    }, [visibleMessages, isUserAtBottom, scrollToBottom]);
    
    // useEffect hook for playing intro messages
    useEffect(() => {
        let timeoutId: number | null = null;
        let isCancelled = false; // Flag to handle cleanup
        let isIntroSpeaking = false; // Track if intro speech is playing
        
        // The asynchronous function that contains the playback logic
        const playMessagesSequentially = async () => {
            // Only play intros if enabled and speech is on
            if (!introMessagesOnly || !settings?.speech) {
                // Show all messages in natural chronological order (oldest -> newest)
                setVisibleMessages(messages);
                return;
            }
            
            setVisibleMessages([]); // Start with no messages visible
            isIntroSpeaking = true;
            
            const speechUtil = SpeechUtil.getInstance();
            
            try {
                for (const message of messages) {
                    if (isCancelled) {
                        break;
                    }
                    
                    // Show the message immediately in UI
                    setVisibleMessages(prev => [...prev, message]);
                    
                    // If it's an assistant message, speak it before proceeding
                    if (message.role === Role.ASSISTANT && message.personaId) {
                        const persona = personaMap[message.personaId];
                        if (persona) {
                            speechUtil.initializeSpeechSynthesis(persona);
                            speechUtil.queueSpeechChunk(message.text, persona);
                            await speechUtil.finalizeSpeechQueue(persona);
                            
                            // Wait until speech finishes before proceeding
                            await speechUtil.waitUntilSpeechFinished();
                            
                            if (isCancelled) {
                                break;
                            }
                        }
                    }
                }
            }
            finally {
                isIntroSpeaking = false;
            }
        };
        
        if (introMessagesOnly && settings?.speech) {
            // Small delayed start to let layout settle
            timeoutId = window.setTimeout(() => {
                if (!isCancelled) {
                    playMessagesSequentially();
                }
            }, 500); // Delay before starting playback
        }
        else {
            // Show all messages if not playing intro speech
            setVisibleMessages(messages);
        }
        
        // Cleanup function for this effect
        return () => {
            isCancelled = true;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            
            if (isIntroSpeaking) {
                // Only cancel speech if intro speech is currently playing
                SpeechUtil.getInstance().cancelSpeech();
            }
        };
    }, [introMessagesOnly, settings?.speech, messages, personaMap]);
    
    // ------------------------- Scrolling Utilities ------------------------- //
    /**
     * Begins a programmatic auto-scroll window during which scroll events are ignored.
     * This prevents programmatic scrolling from flipping `isUserAtBottom`.
     */
    const startAutoScrollWindow = (timeoutInMillis = 150) => {
        isAutoScrollingRef.current = true;
        
        if (autoScrollTimeoutRef.current) {
            clearTimeout(autoScrollTimeoutRef.current);
        }
        
        autoScrollTimeoutRef.current = window.setTimeout(() => {
            isAutoScrollingRef.current   = false;
            autoScrollTimeoutRef.current = null;
        }, timeoutInMillis);
    };
    
    // ------------------------------- Helpers ------------------------------- //
    /**
     * Begins editing the provided message.
     * 
     * @param message - The message to edit
     */
    const handleStartEdit = (message: ChatMessage) => {
        setEditingMessageId(message.id);
        setEditContent(message.text);
    };
    
    /**
     * Saves the currently edited message:
     * - Finds the edited message index, updates text, keeps messages up to that index
     * - updateMessages (awaited), then re-requests assistant response by calling
     *   handleMessageResponse
     * 
     * @param messageOutro - Text to append to the agent response or {@code null} if none
     */
    const handleSaveEdit = async () => {
        if (editingMessageId === null) {
            return;
        }
        
        // Terminate any active audio playback
        if (settings?.speech) {
            SpeechUtil.getInstance().interruptSpeech();
        }
        
        let updatedMessages: ChatMessage[] = [];
        
        // Delete the message with the given message id (i.e., editingMessageId) and all
        // messages that follow it.
        // It is more likely that the user edits a recent message; start from the end
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].id === editingMessageId) {
                messages[i].text = editContent;
                updatedMessages = messages.slice(0, i + 1);
                break;
            }
        }
        
        // Apply the update synchronously
        const meetWithAgent = activeAgentId !== null;
        await updateMessages(updatedMessages,
                             meetWithAgent? null : currProblem!.problemId,
                             meetWithAgent? activeAgentId : currTranscript!.id,
                             editContent);
        setEditingMessageId(null);
        
        let selectedPersona: DBPersona
        if (meetWithAgent) {
            const match = currEmbeddedPersonas.find(p => p.personaId === activeAgentId);
            if (!match) {
                 throw new Error(`Agent ${activeAgentId} not found`);
            }
            selectedPersona = match;
        }
        else{
            selectedPersona = currEmbeddedPersonas.length === 1 ?
                              currEmbeddedPersonas[0]:
                              await selectBestPersona([editContent], currEmbeddedPersonas);
        }

        // Send updated messages to the backend using a local copy
        await handleMessageResponse(updatedMessages, selectedPersona.personaId);
    };
    
    /**
     * Cancels the current message editing operation.
     *
     * - Resets the editing state by clearing the `editingMessageId`.
     * - Empties the `editContent` field to remove any unsaved text.
     */
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };
    
    
    /**
     * Deletes all messages after the provided message (keeps up to and
     * including that message).
     * 
     * @param message - The message to remove all its subsequent messages
     */
    const handleDeleteMessages = async (message: ChatMessage):Promise<ChatMessage[]> => {
        // Terminate any active audio playback
        if (settings?.speech) {
            SpeechUtil.getInstance().interruptSpeech();
        }
        
        let updatedMessages: ChatMessage[] = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].id === message.id) {
                updatedMessages = messages.slice(0, i + 1);
                break;
            }
        }
        
        const meetWithAgent = activeAgentId !== null;
        await updateMessages(updatedMessages,
                             meetWithAgent? null : currProblem!.problemId,
                             meetWithAgent? activeAgentId : currTranscript!.id,
                             null);
                
        return updatedMessages;
    };
    
    /**
     * Finds the user message that precedes the provided (assistant) message
     * to retrieve a new response and deletes all subsequent messages starting
     * from the provided (which is replaced by the new respose).
     * 
     * @param message - The assistant message to locate the user message to
     *                  retrieve the new response for
     */
    const handleRetry = async(message: ChatMessage) => {
        const messages = await handleDeleteMessages(message);
        const personaId = message.personaId;
        await handleMessageResponse(messages.slice(0, -1), personaId);
    };
    
    /**
     * Handles the response from the backend.
     * 
     * @param messages  - The messages to send to the backend
     * @param personaId - The persona id of the assistant message or
     *                    {@code null} if user message
     */
    async function handleMessageResponse(messages : ChatMessage[],
                                         personaId: string | null) {
        const persona: DBPersona | null = personaId !== null? findDBPersonaById(personaId) : null;
        const userMessage   = messages[messages.length - 1];
        const priorMessages = messages.slice(0, -1); // Exclude the user message
        
        try {
            await sendMessageWithStreaming(userMessage,
                                           settings,
                                           persona,
                                           activeAgentId,
                                           currProblem,
                                           currTranscript,
                                           priorMessages,
                                           setMessages,
                                           saveMessage,
                                           setResponseMessage,
                                           false, // Do not save user message again
                                           currEmbeddedPersonas,
                                           chatId);
        }
        catch (error) {
            console.error("Error fetching message response:", error);
        }
    }
    
    /**
     * Loops through the CachedDBPersona objects to find which one has the
     * provided persona ID and returns it as DBPersona object (i.e., excluding
     * the embedding).
     *
     * @param personaId - The ID of the persona to look for
     * 
     * @return the matching DBPersona with embedding removed, or
     *         {@code null} if not found
     */
    function findDBPersonaById(personaId: string): DBPersona | null {
        const match = personaMap[personaId];
        if (!match) {
            return null;
        }
        
        // Exclude embedding field
        const { embedding: _, ...dbPersona } = match;
        return dbPersona;
    }
    
    /**
     * Retrieves the avatar component associated with a given persona ID.
     *
     * @param personaId - The persona ID to look up
     * 
     * @returns the corresponding avatar component, or {@code null} if not found
     */
    function getAvatarFor(personaId: string | null): AvatarComponent | null {
        if (personaId === null) {
            return null;
        }
        return avatarMap[personaId] ?? null;
    }
    
    /** The ID of the fist assistant message  */
    const firstAssistantMessageId = messages.find((message) => message.role === Role.ASSISTANT)?.id;
    
    // ------------------------------- RENDER -------------------------------- //
    return (
      <div ref={containerRef}
           {...props}
           className={cn(`flex flex-col gap-3 overflow-y-auto h-full w-full
                          scrollbar-thumb-blue scrollbar-thumb-rounded
                          scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch`,
                      className 
           )}
      >
        {/* Add a div to fill in the space of an empty chat so that if there
            is only one message is shows at the very top and not at the very bottom */}
        <div className="flex-1 flex-grow"/>
        
        {visibleMessages.map((message) => {
          // Resolve persona and avatar safely
          const BotAvatar = getAvatarFor(message.personaId)
          const personaName = message.personaId? personaMap[message.personaId]?.name : undefined;
          const textColor = message.role === Role.USER ? "text-white" : "text-gray-900";
          
          return (
            <div key      ={message.id}
                 className={cn("flex w-full", {
                               "justify-start": message.role === Role.ASSISTANT,
                               "justify-end": message.role === Role.USER,
                            })}
            >
              <div className="flex items-start gap-2 max-w-[80%]">
                {message.role === Role.USER ? (
                  <>
                    {/* Message Bubble */}
                    <div className="flex flex-col items-end text-right text-sm">
                      <div className="prose max-w-none">
                        {editingMessageId === message.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea value     ={editContent}
                                      onChange  ={(e) => setEditContent(e.target.value)}
                                      className ="w-full p-2 rounded-md border border-black
                                                  text-black bg-white focus:ring-2
                                                  focus:ring-blue-500 focus:outline-none"
                                      rows      ={4}
                            />
                            <div className="flex gap-2">
                              <button onClick   ={handleSaveEdit}
                                      className ="flex items-center gap-1 px-3 py-1 bg-blue-500
                                                  text-white rounded-md hover:bg-blue-600"
                              >
                                <Check size={16} />
                                <span>Save &amp; Submit</span>
                              </button>
                              
                              <button onClick   ={handleCancelEdit}
                                      className ="flex items-center gap-1 px-3 py-1 text-sm 
                                                  bg-gray-200 hover:bg-gray-300 text-gray-700
                                                  rounded-md transition-colors"
                              >
                                <X size={16} />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={cn("px-4 py-2 rounded-lg", textColor)}
                                 style    ={{backgroundColor: UserAvatar.background}}
                            >
                              <MarkdownBlock content={message.text} />
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                              {/* User Actions */}
                              <div className="flex items-center space-x-1">
                                <button onClick   ={() => handleStartEdit(message)}
                                        className ="flex items-center gap-1 px-2 py-1 text-xs
                                                    text-gray-500 hover:text-gray-700
                                                    hover:bg-gray-100 rounded-md"
                                        title     ="Edit message"
                                >
                                  <Edit size={14} />
                                  <span>Edit</span>
                                </button>
                                
                                <button onClick   ={() => handleDeleteMessages(message)}
                                              className ="flex items-center gap-1 px-2 py-1 text-xs
                                                          text-red-400 hover:text-red-600
                                                          hover:bg-red-50 rounded-md"
                                              title     ="Delete message"
                                >
                                  <Trash2 size={14} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Avatar */}
                    <UserAvatar textColor={textColor}
                                name     ={username !== null? username : undefined}
                    />
                  </>
                ) : (
                  <>
                    {/* Assistant Avatar */}
                    {BotAvatar ? <BotAvatar textColor={textColor} name={personaName} /> :
                                 <Bot size={18} />
                    }
                    
                    {/* Assistant Message Bubble */}
                    <div className="flex flex-col items-start text-left text-sm">
                      <div className="prose max-w-none">
                        <div className={cn("px-4 py-2 rounded-lg", textColor)}
                             style    ={{backgroundColor: BotAvatar?.background}}
                        >
                          <MarkdownBlock content={message.text} />
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                          {/* Assistant Retry */}
                          {message.id !== firstAssistantMessageId  &&
                           message.id === messages[messages.length-1]?.id && (
                            <button onClick   ={() => handleRetry(message)}
                                    className ="flex items-center gap-1 px-2 py-1 text-xs
                                                bg-gray-100 hover:bg-gray-200 text-gray-700
                                                rounded-md transition-colors"
                            >
                              <RefreshCw size={14} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
}
