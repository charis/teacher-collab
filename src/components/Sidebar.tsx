// Library imports
import { useMemo } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
// Custom imports
import { isFixedAgentMode } from "@/util/SettingsUtil"; 
import { DBChat, DBPersona, Role, Settings } from "@/types";
import { MIN_INTERACTIONS, PROBLEM_ID_PREFIX_TO_SKIP } from "@/constants";

interface SidebarProps {
    activeChat           : DBChat;
    activeProblemId      : string | null;
    setActiveProblemId   : React.Dispatch<React.SetStateAction<string | null>>;
    setActiveTranscriptId: React.Dispatch<React.SetStateAction<number | null>>;
    activeAgent          : DBPersona | null;
    setActiveAgent       : React.Dispatch<React.SetStateAction<DBPersona | null>>;
    isOpen               : boolean;
    settings             : Settings | null;
    categories           : string[];
    selectedCategory     : string | null;
    switchToCategory     : (category: string | null) => Promise<void>;
}

/**
 * Sidebar component displays the list of learning sequence problems and their
 * completion status.
 * It allows users to switch between problems within the active chat and
 * automatically updates the corresponding transcript when a new problem is
 * selected.
 *
 * @param activeChat             - The currently active chat containing all learning sequences.
 * @param activeProblemId        - The ID of the currently active problem.
 * @param setActiveProblemId     - Function to update the active problem ID when the user
 *                                 selects a different problem.
 * @param setActiveTranscriptId  - Function to update the active transcript ID (automatically
 *                                 set to the first transcript of the selected problem).
 * @param isOpen                 - Whether the sidebar is visible or hidden.
 *
 * @returns JSX element representing the sidebar UI, or {@code null} when the sidebar is closed.
 */
export function Sidebar({activeChat,
                         activeProblemId,
                         setActiveProblemId,
                         setActiveTranscriptId,
                         activeAgent,
                         setActiveAgent,
                         isOpen,
                         settings,
                         categories,
                         selectedCategory,
                         switchToCategory}: SidebarProps) {
    // Sidebar category dropdown is shown only when the admin has picked
    // the "All" mode in Settings (i.e. settings.categoryName is null).
    const showSidebarFilter = settings != null && settings.categoryName == null;
    type ProblemSummary = {
        id          : string;
        title       : string;
        transcriptId: number;
        isComplete  : boolean;
    };

    // ----------------------------   M E M O   ----------------------------- //
    // Compute problems summary from activeChat's learning sequences
    const problems: ProblemSummary[] = useMemo(() => {
        const dbLearningSequences = activeChat?.learningSequences ?? [];
        const lookup = new Map<string, ProblemSummary>();

        dbLearningSequences.forEach(dbLearningSequence => {
            const dbTranscript = dbLearningSequence.transcript;
            const dbMessages   = dbLearningSequence.messages;
            const problemId    = dbTranscript.problem.problemId;
            if (problemId.startsWith(PROBLEM_ID_PREFIX_TO_SKIP)) {
                return;
            }
            const title        = dbTranscript.problem.title;
            const transcriptId = dbTranscript.id;

            const numOfPersonas = dbTranscript.problem.personas.length;
            let minInteractions = MIN_INTERACTIONS;
            if (isFixedAgentMode(settings) && numOfPersonas > 1) {
                minInteractions = (numOfPersonas + 1) * MIN_INTERACTIONS;
            }
            const isComplete = (dbMessages ?? []).filter(msg => msg.role === Role.USER)
                                                 .length >= minInteractions;

            if (!lookup.has(problemId)) {
                const problemSummary = {
                    id          : problemId,
                    title       : title,
                    transcriptId: transcriptId,
                    isComplete  : isComplete
                };
                lookup.set(problemId, problemSummary);
            }
            else {
                const existingProblemSummary = lookup.get(problemId)!;
                existingProblemSummary.isComplete = existingProblemSummary.isComplete && isComplete;
            }
        });

        return Array.from(lookup.values());
    }, [activeChat, settings]);
    
    // Compute unique agents (DBPersona) from visible (filtered) problems
    const agents: DBPersona[] = useMemo(() => {
        const dbLearningSequences = activeChat?.learningSequences ?? [];
        const visibleProblemIds = new Set(problems.map(p => p.id));
        const personaLookup = new Map<string, DBPersona>();

        dbLearningSequences.forEach(ls => {
            const problemId = ls?.transcript?.problem?.problemId;
            if (!problemId || !visibleProblemIds.has(problemId)) {
                return;
            }
            const personas = ls?.transcript?.problem?.personas ?? [];
            personas.forEach(persona => {
                if (!personaLookup.has(persona.personaId)) {
                    personaLookup.set(persona.personaId, persona);
                }
            });
        });

        return Array.from(personaLookup.values());
    }, [activeChat, problems]);
    
    // Compute width based on longest name (ch units)
    const agentButtonWidth = useMemo(() => {
        const maxLength = agents.reduce((maxLen, agent) => Math.max(maxLen, agent.name.length), 0);
        return `${Math.max(8, maxLength + 2)}ch`; // min width 8ch
    }, [agents]);
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    if (!isOpen) {
      return null;
    }
    
    return (
      <div className="w-64 bg-gray-900 text-white p-4 flex flex-col h-full">
        <div className="flex-grow overflow-auto">
          {/* CATEGORY FILTER — visible only when the admin enabled "All" in
              Settings, giving users a runtime category switcher. */}
          {showSidebarFilter && (
            <>
              <h2 className="text-lg text-gray-400 mb-2 px-2">CATEGORY</h2>
              <div className="mb-4 px-2">
                <select value    ={selectedCategory ?? ''}
                        onChange ={(e) => switchToCategory(e.target.value || null)}
                        className="w-full bg-gray-800 text-white border border-gray-700
                                   rounded px-2 py-1 text-sm focus:outline-none
                                   focus:border-gray-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* MEET THE AGENTS section */}
          <h2 className="text-lg text-gray-400 mb-2 px-2">
            MEET THE AGENTS
          </h2>
          <div className="mb-4 px-2">
            {agents.length > 0 ? (
              <ul className="flex flex-wrap  gap-x-10 gap-y-2">
                {agents.map(agent => {
                  const isActive = activeAgent?.personaId === agent.personaId;
                  return (
                    <li key={agent.personaId} className="max-w-full">
                      <button onClick  ={() => {
                                          // Unselect problem + transcript when agent is selected
                                          setActiveProblemId(null);
                                          setActiveTranscriptId(null);
                                          
                                          // Set active agent
                                          setActiveAgent(agent);
                                        }}
                              style    ={{ width: agentButtonWidth }}
                              className={`px-2 py-1 text-sm rounded-2xl truncate
                                          block max-w-[12rem]
                                          transition-all duration-150
                                          ${isActive ?
                                            "bg-gray-700 text-white" :
                                            "bg-gray-800 text-white hover:bg-gray-700"}
                                          cursor-pointer
                                        `}
                              title    ={agent.name}
                      >
                        {agent.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No agents assigned</div>
            )}
          </div>
          
          <h2 className="text-lg text-gray-400 mb-2">
            LEARNING SEQUENCES
          </h2>
          <ul>
            {problems.map((problem) => (
              <li key={problem.id}>
                <div className="relative group">
                  <button onClick={() => {
                                    // Unselect agent when a learning sequence is selected
                                    setActiveAgent(null);
                                    
                                    // Set active problem + transcript
                                    if (problem.id !== activeProblemId) {
                                      setActiveProblemId(problem.id);
                                      setActiveTranscriptId(problem.transcriptId);
                                    }
                                  }}
                          className={`flex items-center gap-2 w-full p-2 text-left rounded
                                      ${activeProblemId === problem.id && !activeAgent ?
                                        'bg-gray-700' : 'hover:bg-gray-800'}`}
                  >
                    {problem.isComplete ? (
                       <CheckCircle size={16} className="text-green-500" />
                     ) : (
                       <AlertCircle size={16} className="text-red-500" />
                    )}
                    <span className={`truncate ${problem.isComplete ?
                                               'text-green-500' : 'text-red-500'}`}>
                      {problem.title}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
};