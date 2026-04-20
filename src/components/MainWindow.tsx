"use client"

// Library imports
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import Image from 'next/image';
import "@/styles/react-tabs.css";
import dynamic from 'next/dynamic';
// Custom imports
import QueryProvider from "@/components/QueryProvider";
import MarkdownBlock from "@/components/chatbot/MarkdownBlock";
import ResponsiveImage from "@/components/ResponsiveImage";
import { ChatInput } from "@/components/chatbot/ChatInput";
import { ChatWindow } from "@/components/chatbot/ChatWindow";
import { Button } from "@/components/teacher/ui/button";
import { Card } from "@/components/teacher/ui/card";
import { ScrollArea } from "@/components/teacher/ui/scroll-area";
import { getPersonas, getProblem } from "@/util/DBUtil";
import { getPersonaEmbeddings } from "@/util/PersonaUtil";
import { isFixedAgentMode } from "@/util/SettingsUtil"; 
import { SpeechUtil } from "@/util/SpeechUtil";
import CompletionModal from "@/components/modal/CompletionModal";
import { CachedDBPersona,
         ChatMessage,
         DBLearningSequence,
         DBPersona,
         DBProblem,
         Gender,
         Role,
         Settings } from "@/types";
import { FemaleAvatars, MaleAvatars } from "@/icons/Personas";
const Whiteboard = dynamic(() => import("@/components/Whiteboard"), { ssr: false });
import { MIN_INTERACTIONS, TTS_SERVICE_PROVIDER } from "@/constants";
import type { AvatarComponent } from '@/icons/Personas';

interface MainWindowProps {
    username             : string | null;
    settings             : Settings | null;
    activeChatId         : number;
    activeCategory       : string | null;
    learningSequences    : DBLearningSequence[];
    activeAgent          : DBPersona | null;
    activeProblemId      : string | null;
    activeTranscriptId   : number | null;
    setActiveTranscriptId: React.Dispatch<React.SetStateAction<number | null>>;
    messages             : ChatMessage[];
    setMessages          : React.Dispatch<React.SetStateAction<
                                                Record<number | string, ChatMessage[]>>>;
    updateMessages       : (updatedMessages: ChatMessage[],
                            problemId          : string | null,
                            transcriptOrAgentId: number | string,
                            text               : string | null) => Promise<void>;
    addMessage           : (message            : ChatMessage,
                            problemId          : string | null,
                            transcriptOrAgentId: number | string) => Promise<void>;
    setResponseMessage   : (message            : ChatMessage,
                            transcriptOrAgentId: number | string,
                            text               : string | null) => void;
    onNextProblem        : () => void;
    onPrevProblem        : () => void;
    onAllCompleted       : () => void | Promise<void>;
}

export function MainWindow({ username,
                             settings,
                             activeChatId,
                             activeCategory,
                             learningSequences,
                             activeAgent,
                             activeProblemId,
                             activeTranscriptId,
                             setActiveTranscriptId,
                             messages,
                             setMessages,
                             updateMessages,
                             addMessage,
                             setResponseMessage,
                             onNextProblem,
                             onPrevProblem,
                             onAllCompleted }: MainWindowProps) {
    // ---------------------------   S T A T E   ---------------------------- //
    const [leftTabIndex,           setLeftTabIndex]           = useState<number>(0);
    // State to store pre-computed embeddings
    const [embeddedPersonas,       setEmbeddedPersonas]       = useState<CachedDBPersona[]>([]);
    // Store the current embedded personas for the current transcript
    const [currEmbeddedPersonas,   setCurrEmbeddedPersonas]   = useState<CachedDBPersona[]>([]);
    const [canProgressOverride,    setCanProgressOverride]    = useState<boolean | null>(null);
    const [isWhiteboardFullscreen, setIsWhiteboardFullscreen] = useState(false);

    // Exit whiteboard fullscreen on Escape
    useEffect(() => {
        if (!isWhiteboardFullscreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsWhiteboardFullscreen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isWhiteboardFullscreen]);
    const [showCompletionModal,  setShowCompletionModal]  = useState(false);
    const [highlightedText,      setHighlightedText]      = useState<string | null>(null);
    // Index of the currently-displayed transcript for the active problem
    const [currTranscriptIndex,  setCurrTranscriptIndex]  = useState<number>(0);
    
    // Local fetched problem state
    const [activeProblem,    setActiveProblem]    = useState<DBProblem | null>(null);
    const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
    
    // Store the number of minimum interactions
    const [minInteractions,  setMinInteractions]  = useState(MIN_INTERACTIONS);
    
    // ----------------------------   M E M O   ----------------------------- //
    const iconMap = useMemo(() => {
        const map: Record<string, AvatarComponent> = {};

        let femaleIndex = 0;
        let maleIndex = 0;

        // Build from all embedded personas so meet-the-agents icons are always available
        for (const persona of embeddedPersonas) {
            if (persona.gender === Gender.FEMALE) {
                map[persona.personaId] = FemaleAvatars[femaleIndex % FemaleAvatars.length];
                femaleIndex++;
            }
            else if (persona.gender === Gender.MALE) {
                map[persona.personaId] = MaleAvatars[maleIndex % MaleAvatars.length];
                maleIndex++;
            }
        }

        return map;
    }, [embeddedPersonas]);
        
    const interactionCount = messages.filter(msg => msg.role === Role.USER).length;
    const canProgress = canProgressOverride !== null
        ? canProgressOverride
        : interactionCount >= minInteractions && minInteractions > 0;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const transcriptRef  = useRef<HTMLDivElement>(null);
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    useEffect(() => {
        async function preload() {
            const dbPersonas = await getPersonas();
            const cachedPersonas = await getPersonaEmbeddings(dbPersonas);
            
            if (!cachedPersonas || cachedPersonas.length === 0) {
                throw new Error("No personas are loaded");
            }
            
            setEmbeddedPersonas(cachedPersonas);
        }
        preload();
    }, []);
    
    // Fetch DBProblem by id
    useEffect(() => {
        // Reset progress override when problem changes so computed value takes over
        setCanProgressOverride(null);

        if (activeProblemId == null) {
            setActiveProblem(null);
            setIsLoadingProblem(false);
            return; // do nothing when null
        }
        
        let cancelled = false;
        
        // Reset the tab when the active problem changes
        setLeftTabIndex(0);
        const loadProblem = async () => {
            setIsLoadingProblem(true);
            
            try {
                const problem = await getProblem(activeProblemId);
                
                if (cancelled || problem === null) {
                    return;
                }
                
                setActiveProblem(problem);
            }
            catch (error) {
                console.error('[MainWindow] error loading problem', error);
            }
            finally {
                if (!cancelled) {
                    setIsLoadingProblem(false);
                }
            }
        };
        
        loadProblem();
        
        return () => { cancelled = true; };
    }, [activeProblemId]);
    
    // Build the currEmbeddedPersonas from the fetched activeProblem + full embedded pool
    useEffect(() => {
        const dbPersonas = activeProblem?.personas ?? [];
        if (dbPersonas.length === 0) {
            setCurrEmbeddedPersonas([]);
            return;
        }

        // Only include personas that belong to the current problem
        const filtered = embeddedPersonas.filter(ep =>
            dbPersonas.some(p => p.personaId === ep.personaId)
        );
        setCurrEmbeddedPersonas(filtered);
    }, [activeProblem, embeddedPersonas]);
    
    // Reset current transcript index when active problem changes
    useEffect(() => {
        setCurrTranscriptIndex(0);
    }, [activeProblemId]);

    // Reset progress override when transcript changes so the computed value takes over
    useEffect(() => {
        setCanProgressOverride(null);
    }, [currTranscriptIndex]);
    
    // Ensure index is within bounds if problem changes
    useEffect(() => {
        const numOfTranscripts = activeProblem?.transcripts?.length ?? 0;
        if (numOfTranscripts === 0) {
            setCurrTranscriptIndex(0);
        }
        else if (currTranscriptIndex >= numOfTranscripts) {
            setCurrTranscriptIndex(Math.max(0, numOfTranscripts - 1));
        }
    }, [activeProblem, currTranscriptIndex]);
    
    // Calculate the number of minimum interactions to consider the learning sequence
    // complete
    useEffect(() => {
        if (!activeProblem) {
            setMinInteractions(MIN_INTERACTIONS);
            return;
        }
        
        const numOfPersonas = activeProblem.personas.length;
        const minInteractions = (isFixedAgentMode(settings) && numOfPersonas > 1)?
                                (numOfPersonas + 1) * MIN_INTERACTIONS : MIN_INTERACTIONS;

        setMinInteractions(minInteractions);
    }, [activeProblem, settings]);

    /**
     * **Prefetch-on-render pattern for image descriptions.**
     *
     * When a problem is displayed, any image without a cached description is
     * sent to {@code GET /api/imageDescription} which either returns the
     * existing DB value or generates one via GPT-4o vision and caches it.
     *
     * The call is fire-and-forget: by the time the user reads the problem and
     * types a message, the description is already in the DB for the agent's
     * system prompt. {@link ChatUtil.fetchImageDescription} acts as a fallback
     * if the prefetch hasn't finished yet.
     */
    useEffect(() => {
        if (!activeProblem) return;

        // Prefetch problem image description
        if (activeProblem.imageURL && !activeProblem.imageDescription) {
            fetch(`/api/imageDescription?type=problem&id=${encodeURIComponent(activeProblem.problemId)}`)
                .catch(() => {}); // fire-and-forget
        }

        // Prefetch transcript image descriptions
        for (const t of activeProblem.transcripts) {
            if (t.imageURL && !t.imageDescription) {
                fetch(`/api/imageDescription?type=transcript&id=${t.id}`)
                    .catch(() => {}); // fire-and-forget
            }
        }
    }, [activeProblem]);

    // Helper to get current transcript text (no fallback to transcript.text)
    const currTranscriptText = React.useMemo(() => {
        return activeProblem?.transcripts?.[currTranscriptIndex]?.text ?? "";
    }, [activeProblem, currTranscriptIndex]);
    
    // Helper to get the current transcript object
    const currTranscript = React.useMemo(() => {
        return activeProblem?.transcripts?.[currTranscriptIndex] ?? null;
    }, [activeProblem, currTranscriptIndex]);
    
    // Helper to get current transcript imageURL (no fallback to transcript.imageURL)
    const currentTranscriptImageURL = React.useMemo(() => {
        return activeProblem?.transcripts?.[currTranscriptIndex]?.imageURL ?? null;
    }, [activeProblem, currTranscriptIndex]);

    useEffect(() => {
        if (messages.length === 0) {
            return;
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === Role.ASSISTANT) {
            const quoteMatch = lastMessage.text.match(/"([^"\n]+)"/);
            if (!quoteMatch?.[1]) {
                return;
            }

            const quote = quoteMatch[1].trim();
            if (!quote) {
                return;
            }
            
            if (currTranscriptText.includes(quote)) {
                setHighlightedText(quote);
                setTimeout(() => {
                    transcriptRef.current?.querySelector('mark')?.scrollIntoView({
                        behavior: 'smooth',
                        block   : 'center'
                    });
                }, 100);
            }
        }
    }, [messages, currTranscriptText]);
    
    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    // Cancel speech when switching transcripts
    useEffect(() => {
       SpeechUtil.getInstance().cancelSpeech();
    }, [activeTranscriptId]);
    
    // Update the activeTranscriptId whenever currTranscriptIndex changes
    useEffect(() => {
        const transcriptId = activeProblem?.transcripts?.[currTranscriptIndex]?.id;
        if (typeof transcriptId === "number" && transcriptId !== activeTranscriptId) {
            setActiveTranscriptId(transcriptId);
        }
    }, [activeProblem, currTranscriptIndex, activeTranscriptId, setActiveTranscriptId]);
      
    // Load voices
    useEffect(() => {
        const personas: DBPersona[] = currEmbeddedPersonas.map(embeddedPersona => ({
            personaId     : embeddedPersona.personaId,
            name          : embeddedPersona.name,
            gender        : embeddedPersona.gender,
            description   : embeddedPersona.description,
            initialMessage: embeddedPersona.initialMessage,
            instructions  : embeddedPersona.instructions,
            skills        : embeddedPersona.skills,
            category      : embeddedPersona.category
        }));
        
        SpeechUtil.getInstance().initSpeech(personas, TTS_SERVICE_PROVIDER);
    }, [currEmbeddedPersonas]);
    
    // Add a ref to track if we're actually ending the session
   
    /**
     * Advances the learning flow:
     *   1. If more transcripts remain for this problem → next transcript
     *   2. If last transcript but more problems remain → next problem (first transcript)
     *   3. If last transcript of last problem → show completion modal
     */
    const handleProgressSequence = () => {
        if (!canProgress) {
            return;
        }

        // Prevent double-triggers while we transition
        setCanProgressOverride(false);

        const maxTranscriptIndex = (activeProblem?.transcripts?.length ?? numOfTranscripts) - 1;
        if (currTranscriptIndex < maxTranscriptIndex) {
            // More transcripts for this problem → next transcript
            setCurrTranscriptIndex(i => Math.min(maxTranscriptIndex, i + 1));
            setHighlightedText(null);
        }
        else {
            // Last transcript of this problem — check if there are more problems
            const problemIds = [...new Set(
                learningSequences.map(ls => ls.transcript.problem.problemId)
            )];
            const currProblemIdx = problemIds.indexOf(activeProblemId ?? '');
            if (currProblemIdx < problemIds.length - 1) {
                // More problems → advance to next problem
                setCurrTranscriptIndex(0);
                setHighlightedText(null);
                onNextProblem();
            }
            else {
                // All problems and transcripts exhausted → show completion modal
                // (chat is not marked complete until user clicks Submit or Skip)
                setShowCompletionModal(true);
            }
        }
    }
    
    /**
     * Goes back in the learning flow:
     *   1. If not on the first transcript → previous transcript
     *   2. If on the first transcript but previous problems exist → previous problem (last transcript)
     *   3. If on the first transcript of the first problem → no-op
     */
    const handlePreviousSequence = () => {
        if (currTranscriptIndex > 0) {
            // Previous transcript within this problem
            setCurrTranscriptIndex(i => i - 1);
            setHighlightedText(null);
            setCanProgressOverride(null);
        }
        else {
            // First transcript — check for previous problem
            const problemIds = [...new Set(
                learningSequences.map(ls => ls.transcript.problem.problemId)
            )];
            const currProblemIdx = problemIds.indexOf(activeProblemId ?? '');
            if (currProblemIdx > 0) {
                // Go to previous problem's last transcript
                onPrevProblem();
                // Set to last transcript of previous problem after it loads
                // We use a large number — the useEffect clamping will bring it to max
                setCurrTranscriptIndex(999);
                setHighlightedText(null);
                setCanProgressOverride(null);
            }
        }
    };

    /** Whether the "Previous" button should be shown. */
    const canGoBack = (() => {
        if (currTranscriptIndex > 0) return true;
        const problemIds = [...new Set(
            learningSequences.map(ls => ls.transcript.problem.problemId)
        )];
        return problemIds.indexOf(activeProblemId ?? '') > 0;
    })();

    // Navigation controls for transcripts
    const numOfTranscripts = activeProblem?.transcripts?.length ?? 0;
    const goPrevTranscript = () => {
        setCurrTranscriptIndex(i => Math.max(0, i - 1));
        setHighlightedText(null);
    };
    const goNextTranscript = () => {
        setCurrTranscriptIndex(i => {
            const max = (activeProblem?.transcripts?.length ?? 1) - 1;
            return Math.min(max, i + 1);
        });
        setHighlightedText(null);
    };
    
    // If problem is still loading or not available, render a placeholder (safe)
    if (isLoadingProblem) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Image src    = "/images/loading.png"
                   alt    = "Completed learning sequences image"
                   height = {600}
                   width  = {900}
                   priority // This tells Next.js to preload it
            />
          </div>
        );
    }
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel - Problem */}
        <Card className="lg:col-span-2 p-4 h-[calc(100vh-100px)] flex flex-col
                         min-h-0 min-w-0 overflow-hidden">
          {activeAgent ? (
            // Show avatar only if activeAgent is set
            <div className="flex justify-center items-center h-full">
              {React.createElement(iconMap[activeAgent.personaId], {
                 name: activeAgent.name,
                 textColor: "white",
                 size     : 256
              })}
            </div>
          ) : (
            // Show tabs if no activeAgent
            /*   T A B S   */
            <Tabs className          ="flex-1 flex flex-col min-h-0 h-full"
                  selectedIndex       ={leftTabIndex}
                  onSelect            ={(i) => setLeftTabIndex(i)}
            >
              {/* Tabs header row */}
              <div className="flex items-center justify-between gap-4">
                <TabList className="flex items-stretch gap-2 p-0 m-0">
                  <Tab className="inline-flex rounded-t-[10px] px-5 py-3 text-xs font-medium
                                  cursor-pointer bg-white text-cardinal-red border
                                  border-cardinal-red hover:bg-red-50 transition-all
                                  duration-150 focus:outline-none focus:ring-0"
                       selectedClassName="!bg-cardinal-red !text-white
                                          !border-transparent !z-10 !-mb-px"
                  >
                    <span>Problem</span>
                  </Tab>
                  <Tab className="inline-flex rounded-t-[10px] px-5 py-3 text-xs font-medium
                                  cursor-pointer bg-white text-cardinal-red border
                                  border-cardinal-red hover:bg-red-50 transition-all
                                  duration-150 focus:outline-none focus:ring-0 border-b-0"
                       selectedClassName="!bg-cardinal-red !text-white
                                          !border-transparent !z-10 !-mb-px"
                  >
                    <span>Transcripts</span>
                  </Tab>
                  {activeCategory === "cs" && (
                  <Tab className="inline-flex rounded-t-[10px] px-5 py-3 text-xs font-medium
                                  cursor-pointer bg-white text-cardinal-red border
                                  border-cardinal-red hover:bg-red-50 transition-all
                                  duration-150 focus:outline-none focus:ring-0 border-b-0"
                       selectedClassName="!bg-cardinal-red !text-white
                                          !border-transparent !z-10 !-mb-px"
                  >
                    <span>Whiteboard</span>
                  </Tab>
                  )}
                </TabList>
              </div>
              
              {/* Panels container */}
              <div className="flex-1 flex flex-col min-h-0 h-full border-cardinal-red 
                              border-1 rounded-b-[10px] rounded-t-none overflow-hidden
                              bg-muted/30 -mt-px">
                {/* Problem panel */}
                <TabPanel className="flex flex-col min-h-0">
                  <ScrollArea className="flex-1 min-h-0 h-full overflow-auto p-4">
                    <div className="whitespace-pre-line">
                      <pre className="text-lg text-cardinal-red text-muted-foreground font-sans
                                      whitespace-pre-wrap break-words">
                        {activeProblem?.title ?? ""}
                      </pre>
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none
                                      [&_.code-block]:bg-[#1e1e2e] [&_.code-block]:rounded-lg
                                      [&_.code-block]:border [&_.code-block]:border-slate-700
                                      [&_code]:bg-slate-800 [&_code]:text-slate-200
                                      [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5
                                      [&_code]:text-sm">
                        <MarkdownBlock content={activeProblem?.text ?? ""} />
                      </div>
                      {activeProblem?.imageURL && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-full aspect-square">
                            <ResponsiveImage src        = {activeProblem.imageURL}
                                             alt        = "Prolem statement"
                                             maxHeightVh={60} // Caps height so UI doesn't blow out
                                             quality    ={100}
                                             sizes="(max-width: 768px) 100vw,
                                                    (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabPanel>
                
                {/* Transcripts panel */}
                <TabPanel className="flex flex-col min-h-0">
                  {/* Nav (outside scrollable content) */}
                  {numOfTranscripts > 0 && (
                    <div className="flex items-center justify-center gap-2 px-4 pt-3">
                      <div className="flex items-center gap-1">
                        <Button variant ="ghost"
                                onClick ={goPrevTranscript}
                                disabled={currTranscriptIndex <= 0}
                                className="text-xl"
                        >
                          &lt;
                        </Button>
                        <div className="text-md text-cardinal-red">
                          Transcript {currTranscriptIndex + 1}
                        </div>
                        <Button variant ="ghost"
                                onClick ={goNextTranscript}
                                disabled={currTranscriptIndex >= numOfTranscripts - 1}
                                className="text-xl"
                        >
                          &gt;
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Scroll area that occupies available space inside the panel */}
                  <ScrollArea className="flex-1 min-h-0 h-full overflow-auto p-4">
                    <div className="whitespace-pre-line">
                      {currentTranscriptImageURL !== null ? (
                         <div className="flex flex-col items-stretch gap-4">
                          <div className="text-sm text-muted-foreground prose prose-sm max-w-none
                                          [&_.code-block]:bg-[#1e1e2e] [&_.code-block]:rounded-lg
                                          [&_.code-block]:border [&_.code-block]:border-slate-700
                                          [&_code]:bg-slate-800 [&_code]:text-slate-200
                                          [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5
                                          [&_code]:text-sm">
                            <MarkdownBlock content={activeProblem?.transcripts?.[currTranscriptIndex]?.text ?? ""} />
                          </div>
                          
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative w-full aspect-square">
                              <ResponsiveImage src        = {currentTranscriptImageURL}
                                               alt        = "Student work"
                                               maxHeightVh={60} //Caps height so UI doesn't blow out
                                               quality    ={100}
                                               sizes="(max-width: 768px) 100vw,
                                                      (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          </div>
                        </div>
                      ) : highlightedText ? (
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none
                                        [&_.code-block]:bg-[#1e1e2e] [&_.code-block]:rounded-lg
                                        [&_.code-block]:border [&_.code-block]:border-slate-700
                                        [&_code]:bg-slate-800 [&_code]:text-slate-200
                                        [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5
                                        [&_code]:text-sm">
                          {currTranscriptText.split(highlightedText).map((part, i, arr) => (
                            <React.Fragment key={i}>
                              <MarkdownBlock content={part} />
                              {i < arr.length - 1 && (
                                <mark className="bg-yellow-200 px-0 rounded
                                                 transition-colors duration-500">
                                  {highlightedText}
                                </mark>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none
                                        [&_.code-block]:bg-[#1e1e2e] [&_.code-block]:rounded-lg
                                        [&_.code-block]:border [&_.code-block]:border-slate-700
                                        [&_code]:bg-slate-800 [&_code]:text-slate-200
                                        [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5
                                        [&_code]:text-sm">
                          <MarkdownBlock content={currTranscriptText} />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabPanel>

                {/* Whiteboard panel (CS only) */}
                {activeCategory === "cs" && (
                <TabPanel className="flex flex-col min-h-0 flex-1">
                  <div className={isWhiteboardFullscreen
                    ? "fixed inset-0 z-50 bg-white"
                    : "flex-1 min-h-0 h-full overflow-hidden relative"
                  }>
                    {/* Fullscreen toggle */}
                    <button
                      onClick  ={() => setIsWhiteboardFullscreen(prev => !prev)}
                      className="absolute top-2 right-2 z-[60] p-2 bg-white border
                                 border-gray-300 rounded shadow hover:bg-gray-100
                                 transition-colors"
                      title    ={isWhiteboardFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                      {isWhiteboardFullscreen ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                             stroke="currentColor" strokeWidth="1.5">
                          <polyline points="5,1 5,5 1,5" />
                          <polyline points="11,1 11,5 15,5" />
                          <polyline points="5,15 5,11 1,11" />
                          <polyline points="11,15 11,11 15,11" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                             stroke="currentColor" strokeWidth="1.5">
                          <polyline points="1,5 1,1 5,1" />
                          <polyline points="15,5 15,1 11,1" />
                          <polyline points="1,11 1,15 5,15" />
                          <polyline points="15,11 15,15 11,15" />
                        </svg>
                      )}
                    </button>

                    {activeTranscriptId != null && (
                      <Whiteboard
                        chatId       = {activeChatId}
                        transcriptId = {activeTranscriptId}
                      />
                    )}
                  </div>
                </TabPanel>
                )}
              </div>
            </Tabs>
          )}
        </Card>
        
        {/* Right panel - Dialogue */}
        <Card className="lg:col-span-3 p-8 h-[calc(100vh-100px)] flex flex-col
                         min-h-0 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            {/* Left side: Prev button + title */}
            <div className="flex items-center gap-2">
              {!activeAgent && activeProblem && canGoBack && (
                <button onClick  ={handlePreviousSequence}
                        className="px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600
                                   text-white text-sm font-medium transition-colors
                                   flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                       strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  Prev
                </button>
              )}
              <h2 className="text-xl font-semibold">
                {activeAgent?
                 `Meeting ${activeAgent.name}` :
                  (activeProblem && activeProblem?.personas.length > 1) ?
                   "Collaborative Analysis" : "Teacher Dialogue"
                }
              </h2>
            </div>

            {/* Right side: Focus + Remaining + Next */}
            {!activeAgent && activeProblem &&
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">Current Focus:</div>
                  {activeProblem.personas &&
                    <div className="px-3 py-1.5 rounded-md bg-muted text-sm
                                    font-semibold text-cardinal-red">
                      {activeProblem.personas.length > 1 ?
                        "Multi-Perspective Analysis" :
                        activeProblem.personas[0].personaId
                      }
                    </div>
                  }
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    Remaining Interactions:{' '}
                    <span className={minInteractions - interactionCount > 0 ?
                                     'font-semibold text-red-500' : 'font-semibold text-green-600'}>
                      {Math.max(minInteractions - interactionCount, 0)}
                    </span>
                  </div>
                  {canProgress && (() => {
                    const maxTIdx = (activeProblem?.transcripts?.length ?? 0) - 1;
                    const problemIds = [...new Set(
                      learningSequences.map(ls => ls.transcript.problem.problemId)
                    )];
                    const isLastStep = currTranscriptIndex >= maxTIdx
                      && problemIds.indexOf(activeProblemId ?? '') >= problemIds.length - 1;

                    return isLastStep ? (
                      <button onClick  ={handleProgressSequence}
                              className="ml-2 px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600
                                         text-white text-sm font-medium transition-colors"
                      >
                        Submit
                      </button>
                    ) : (
                      <button onClick  ={handleProgressSequence}
                              className="ml-2 px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600
                                         text-white text-sm font-medium transition-colors
                                         flex items-center gap-1.5"
                      >
                        Next
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                             strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })()}
                </div>
              </div>
            }
          </div>
          
          <div className="flex-1 relative overflow-hidden"
               style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Absolute positioning for fixed layout */}
            <div className="absolute inset-0 flex flex-col">
              <ChatWindow username             = {username}
                          settings             = {settings}
                          chatId               = {activeChatId}
                          activeAgentId        = {activeAgent?.personaId ?? null}
                          currProblem          = {activeProblem}
                          currTranscript       = {currTranscript}
                          messages             = {messages}
                          setMessages          = {setMessages}
                          updateMessages       = {updateMessages}
                          saveMessage          = {addMessage}
                          setResponseMessage   = {setResponseMessage}
                          currEmbeddedPersonas = {currEmbeddedPersonas}
                          allEmbeddedPersonas  = {embeddedPersonas}
              />
              
              {/* Input form fixed at bottom */}
              <QueryProvider>
                <div className="p-2 min-h-32 w-auto bg-white overflow-hidden">
                  <ChatInput className            = "px-4 pb-2"
                             settings             = {settings}
                             chatId               = {activeChatId}
                             activeAgentId        = {activeAgent?.personaId ?? null}
                             currProblem          = {activeProblem}
                             currTranscript       = {currTranscript}
                             messages             = {messages}
                             setMessages          = {setMessages}
                             saveMessage          = {addMessage}
                             setResponseMessage   = {setResponseMessage}
                             currEmbeddedPersonas = {currEmbeddedPersonas}
                  />
                </div>
              </QueryProvider>
              {/* sentinel for auto-scrolling when messages update */}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </div>
        </Card>
        
        <CompletionModal isOpen    ={showCompletionModal}
                         onClose   ={() => {
                             setShowCompletionModal(false);
                             setCanProgressOverride(null); // Re-enable Submit button
                         }}
                         onConfirm ={async () => {
                             setShowCompletionModal(false);
                             // Mark chat complete in the DB, then reload so
                             // the app initializes to a fresh chat. The
                             // just-completed chat is filtered out of
                             // loadChats (completed: false), so it won't
                             // reappear.
                             await onAllCompleted();
                             window.location.reload();
                         }}
                         surveyURL ="https://forms.gle/FmpxxLDrT2EYYugC6"
        />
      </div>
    );
};