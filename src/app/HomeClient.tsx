"use client";

// Library imports
import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import Image from "next/image";
// Custom imports
import useHasMounted from "@/app/hooks/useHasMounted";
import Topbar from "@/components/topbar/Topbar";
import { ChatInterface } from "@/components/ChatInterface";
import { createChat,
         getChatTemplate,
         getChats,
         getSettings,
         updateChat } from '@/util/DBUtil';
import { DBChat, DBProblem, DBUser, Settings } from "@/types";
import { NO_ACTIVE_CHAT_ID, NO_CHAT_ID_LEFT } from '@/constants';

export default function HomeClient() {
    // ---------------------------   S T A T E   ---------------------------- //
    const [settings,             setSettings]             = useState<Settings | null>(null);
    const [chatRecord,           setChatRecord]           = useState<Record<number, DBChat>>({});
    const [activeChatId,         setActiveChatId]         = useState<number>(NO_ACTIVE_CHAT_ID);
    const [activeProblemId,      setActiveProblemId]      = useState<string | null>(null);
    const [activeTranscriptId,   setActiveTranscriptId]   = useState<number | null>(null);
    const [currProblemCompleted, setCurrProblemCompleted] = useState(false);
    const [allProblemsCompleted, setAllProblemsCompleted] = useState(false);
    const [sidebarOpen,          setSidebarOpen]          = useState(true);
    
    const { data: session, status } = useSession();
    const authenticated = status === "authenticated";
    const learningSequences = chatRecord[activeChatId]?.learningSequences ?? [];
    const problemsMap = new Map<string, DBProblem>();
    for (const learningSequence of learningSequences) {
        const problem = learningSequence.transcript.problem;
        if (!problemsMap.has(problem.problemId)) {
            problemsMap.set(problem.problemId, problem);
        }
    }
    const problems: DBProblem[] = Array.from(problemsMap.values());
    
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    
    const hasMounted = useHasMounted();
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    useEffect(() => {
        if (!hasMounted || status !== "authenticated")  {
            return;
        }
        
        loadSettings();
        init();
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMounted, status]);
    
    // Initializes the chat interface by loading the chats, setting the active chat
    async function init() {
        if (!authenticated || session.user === undefined) {
            return null;
        }
        const userEmail = session.user.email!;
        
        let activeChat: DBChat | null = await loadChats(userEmail);
        
        // If none found, create one and use the returned DBChat
        if (!activeChat) {
            // Create a new chat if no chats are found
            activeChat = await newChat(userEmail);
        }
        
        // If we now have an activeChat, ensure app state is set and also set
        // initial problem/transcript
        if (activeChat) {
            setActiveChatId(activeChat.id);
            
            // If learning sequences exist, set the problem and transcript from
            // the first sequence
            const firstSequence = activeChat.learningSequences?.[0];
            if (firstSequence && firstSequence.transcript) {
                setActiveTranscriptId(firstSequence.transcript.id);
                setActiveProblemId(firstSequence.transcript.problem?.problemId ?? null);
            }
            else {
                // No learning sequences — clear or leave defaults
                setActiveTranscriptId(0);
                setActiveProblemId(null);
            }
          }
    };
    
    async function loadSettings(): Promise<void> {
        try {
            const dbSettings = await getSettings();
            if (dbSettings !== null) {
                const settings: Settings = {
                    ...dbSettings,
                    speech  : false,
                    switches: dbSettings.switches.map((currSwitch) => ({
                        ...currSwitch,
                        selection: currSwitch.isMutualExclusive ?
                                   (currSwitch.selectedOptionIndex ?? 1) : []
                    }))
                }
                setSettings(settings);
            }
            else {
                setSettings(null);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                console.log(error.message);
            }
            else {
                console.log("Error retrieving settings");
            }
        }
    }
    
    // Loads the chats from the database and sets the active chat
    async function loadChats(userEmail: string): Promise<DBChat | null> {
        const dbChats = await getChats(userEmail, false);
        const loadedChatRecord: Record<number, DBChat> = {};
        if (!dbChats) {
            return null;
        }
        
        if (dbChats.length == 0) {
            setActiveChatId(NO_CHAT_ID_LEFT);
            return null;
        }
        
        // The dbChats are sorted by update time; the most recently update is the last element
        const activeChatId = dbChats[dbChats.length - 1].id;
        
        for (const dbChat of dbChats) {
            loadedChatRecord[dbChat.id] = dbChat;
        }
        setChatRecord(loadedChatRecord);
        setActiveChatId(activeChatId);
        
        return dbChats[dbChats.length - 1]; // Return active chat (i.e.,  most recent chat)
    };
    
    // Looks up the next chat template and creates a new chat from it
    async function newChat(userEmail: string): Promise<DBChat | null> {
        const chatTemplate = await getChatTemplate(userEmail);
        if (!chatTemplate) {
            console.log("No unused chat template found");
            setActiveChatId(NO_ACTIVE_CHAT_ID);
            return null;
        }
        
        const [dbChat, _] = await createChat(userEmail, chatTemplate);
        if (!dbChat) {
            console.error("Error creating the default chat in the database");
            setActiveChatId(NO_ACTIVE_CHAT_ID);
            return null;
        }
        
        setChatRecord((prev) => ({
            ...prev,
            [dbChat.id]: dbChat
        }));
        
        return dbChat;
    }
    
    // Selects the next problem
    const nextProblem = () => {
        if (problems.length === 0) {
            return;
        }
        
        const currIndex = problems.findIndex(problem => problem.problemId === activeProblemId);
        if (currIndex === -1) {
            console.error(`Cannot find problem with problemId=${activeProblemId} in problems`)
            return;
        }
        const nextIndex = (currIndex + 1) % problems.length;
        const nextProblemId = problems[nextIndex].problemId;
        setActiveProblemId(nextProblemId);
    }
    
    // Selects the next chat
    const endSession = async() => {
        const [updatedDBChat, error] = await updateChat(activeChatId, true);
        if (error !== null) {
            console.error("Error marking chat with id: " + activeChatId + " as complete:", error);
            return;
        }
        
        setChatRecord((prev) => ({
            ...prev,
            [activeChatId]: updatedDBChat!,
        }));
        
        // Find the chats that have not been completed (i.e., their 'completed' field is false)
        const entriedOfIncompleteChats = Object.entries(chatRecord)
                                               .filter(([_, chat]) => !chat.completed)
                                               .map(([id, chat]) => ({ id: Number(id), chat }));
        
        // From the incomplete chats, select the one with the lowest id
        let selectedEntry = {
            id  : Infinity,
            chat: null as DBChat | null
        };
        
        for (const entry of entriedOfIncompleteChats) {
            if (entry.id < selectedEntry.id) {
              selectedEntry = entry;
            }
        }
        
        const nextChat = selectedEntry.chat;
        if (nextChat !== null) {
            setActiveChatId(nextChat.id);
            setActiveTranscriptId(nextChat.learningSequences[0].transcript.id);
        }
        else {
            // TODO: There should be a new table in the DB that serves as a chat factory.
            //       It should store the transrcipt IDs in a chat like the DEFAULT_LEARNING_SEQUENCE
            //       Then we want to create a new chat we fetch the next factory pattern and create
            //       the chat.
            //       In other words, the DEFAULT_LEARNING_SEQUENCE should move to the DB and have
            //       a mechanism to create more like that (instead of hardcoding it)
        }
    }
    
    // Construct a DBUser from session.user if possible
     // Adjust this according to your DBUser shape
    let dbUser: DBUser | null = null;
    
    if (authenticated && session?.user) {
        dbUser = {
            email     : session.user.email ?? "",
            name      : session.user.name ?? "",
            isAdmin   : false,
            isVerified: false,
            chats     : [],
        };
    }
    
    if (!hasMounted) {
        return null; // prevent hydration mismatch
    }
    
    return (
      <main className="bg-dark-layer-2 min-h-screen h-full flex flex-col">
        <Topbar user                 = {dbUser}
                toggleSidebar        = {toggleSidebar}
                settings             = {settings}
                setSettings          = {setSettings}
                currProblemCompleted = {currProblemCompleted}
                allProblemsCompleted = {allProblemsCompleted}
                nextProblem          = {nextProblem}
                endSession           = {endSession}
        />
        {authenticated ? (
          <div className="flex flex-col flex-grow bg-gray-100">
            <ChatInterface username                = {session?.user?.name?? null}
                           sidebarOpen             = {sidebarOpen}
                           settings                = {settings}
                           chatRecord              = {chatRecord}
                           setChatRecord           = {setChatRecord}
                           activeChatId            = {activeChatId}
                           setActiveChatId         = {setActiveChatId}
                           activeProblemId         = {activeProblemId}
                           setActiveProblemId      = {setActiveProblemId}
                           activeTranscriptId      = {activeTranscriptId}
                           setActiveTranscriptId   = {setActiveTranscriptId}
                           setCurrProblemCompleted = {setCurrProblemCompleted}
                           setAllProblemsCompleted = {setAllProblemsCompleted}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-5rem)] pointer-events-none select-none">
            <Image src    = "/images/banner.png"
                   alt    = "Banner image"
                   height = {600}
                   width  = {900}
                   priority // This tells Next.js to preload it
            />
          </div>
        )}
      </main>
    );
}
