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
         getProblemCategories,
         getSettings,
         updateChat,
         userHasAnyChat } from '@/util/DBUtil';
import { DBChat, DBProblem, DBUser, Settings } from "@/types";
import { NO_ACTIVE_CHAT_ID, NO_CHAT_ID_LEFT } from '@/constants';

export default function HomeClient() {
    // ---------------------------   S T A T E   ---------------------------- //
    const [settings,             setSettings]             = useState<Settings | null>(null);
    const [chatRecord,           setChatRecord]           = useState<Record<number, DBChat>>({});
    const [activeChatId,         setActiveChatId]         = useState<number>(NO_ACTIVE_CHAT_ID);
    const [activeProblemId,      setActiveProblemId]      = useState<string | null>(null);
    const [activeTranscriptId,   setActiveTranscriptId]   = useState<number | null>(null);
    const [sidebarOpen,          setSidebarOpen]          = useState(true);
    const [categories,           setCategories]           = useState<string[]>([]);
    const [selectedCategory,     setSelectedCategory]     = useState<string | null>(null);
    
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

        (async () => {
            // Sequence matters: we need the admin-locked category from
            // Settings before loading chats so that we only surface chats in
            // that category (and auto-create in that category if first-time).
            const loadedSettings = await loadSettings();
            await loadCategories();
            await init(loadedSettings?.categoryName ?? null);
        })();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMounted, status]);

    // Enforce the admin-locked category from Settings. Runs once both the
    // settings and the initial chat are loaded, and every time the admin
    // changes settings.categoryName.
    useEffect(() => {
        if (!settings || !authenticated ||
            activeChatId === NO_ACTIVE_CHAT_ID ||
            activeChatId === NO_CHAT_ID_LEFT) {
            return;
        }
        if (!settings.categoryName || selectedCategory === settings.categoryName) {
            return;
        }

        // Only switch to an existing non-completed chat in the locked
        // category. Never auto-create one here — that path is reserved for
        // explicit admin action via the Settings modal. If no existing chat
        // matches, render the "All done" screen.
        const existing = Object.values(chatRecord).find(
            chat => !chat.completed &&
                    chat.categoryName === settings.categoryName
        );
        if (existing) {
            setActiveChatId(existing.id);
            const firstSeq = existing.learningSequences?.[0];
            if (firstSeq?.transcript) {
                setActiveProblemId(firstSeq.transcript.problem?.problemId ?? null);
                setActiveTranscriptId(firstSeq.transcript.id);
            }
            setSelectedCategory(settings.categoryName);
        }
        else {
            setActiveChatId(NO_CHAT_ID_LEFT);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings?.categoryName, activeChatId]);

    /**
     * Switch to a chat for the given category: either reuse an existing
     * non-completed chat or create a new one. Awaits chat creation so callers
     * know the DB-side work is done before continuing (e.g. before closing
     * the Settings modal).
     */
    async function switchToCategory(category: string | null): Promise<void> {
        setSelectedCategory(category);

        if (!category || !authenticated || !session?.user?.email) {
            return;
        }

        const activeChat = chatRecord[activeChatId];
        if (activeChat && activeChat.categoryName === category) {
            return;
        }

        const existingChat = Object.values(chatRecord).find(
            chat => !chat.completed && chat.categoryName === category
        );

        if (existingChat) {
            setActiveChatId(existingChat.id);
            const firstSeq = existingChat.learningSequences?.[0];
            if (firstSeq?.transcript) {
                setActiveProblemId(firstSeq.transcript.problem?.problemId ?? null);
                setActiveTranscriptId(firstSeq.transcript.id);
            }
            return;
        }

        const chat = await newChat(session.user.email!, category);
        if (chat) {
            setActiveChatId(chat.id);
            const firstSeq = chat.learningSequences?.[0];
            if (firstSeq?.transcript) {
                setActiveProblemId(firstSeq.transcript.problem?.problemId ?? null);
                setActiveTranscriptId(firstSeq.transcript.id);
            }
        }
    }

    // Initializes the chat interface by loading the chats, setting the active chat
    async function init(lockedCategory: string | null) {
        if (!authenticated || session.user === undefined) {
            return null;
        }
        const userEmail = session.user.email!;

        let activeChat: DBChat | null = await loadChats(userEmail, lockedCategory);

        if (!activeChat) {
            const hasHistory = await userHasAnyChat(userEmail);
            if (!hasHistory) {
                // First-time user — create their first chat in the locked
                // category (or let getChatTemplate pick if no lock).
                activeChat = await newChat(userEmail,
                                           lockedCategory ?? undefined);
            }
            else {
                setActiveChatId(NO_CHAT_ID_LEFT);
            }
        }

        // If we now have an activeChat, ensure app state is set and also set
        // initial problem/transcript
        if (activeChat) {
            setActiveChatId(activeChat.id);

            // Set initial category from the active chat
            if (activeChat.categoryName) {
                setSelectedCategory(activeChat.categoryName);
            }

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
    
    async function loadSettings(): Promise<Settings | null> {
        try {
            const dbSettings = await getSettings();
            if (!dbSettings) {
                setSettings(null);
                return null;
            }
            const loaded: Settings = {
                ...dbSettings,
                speech  : false,
                switches: dbSettings.switches.map((currSwitch) => ({
                    ...currSwitch,
                    selection: currSwitch.isMutualExclusive ?
                               (currSwitch.selectedOptionIndex ?? 1) : []
                }))
            };
            setSettings(loaded);
            return loaded;
        }
        catch (error) {
            if (error instanceof Error) {
                console.log(error.message);
            }
            else {
                console.log("Error retrieving settings");
            }
            return null;
        }
    }
    
    async function loadCategories(): Promise<void> {
        try {
            const cats = await getProblemCategories();
            setCategories(cats);
        }
        catch (error) {
            console.error("Error loading categories:", error);
        }
    }

    // Loads the non-completed chats from the database and sets the active
    // chat. When the admin has locked Settings to a category, only chats in
    // that category are considered — any other incomplete chats the user
    // may have are ignored (they'll be surfaced again if the admin unlocks
    // or switches the Settings category).
    async function loadChats(userEmail     : string,
                             lockedCategory: string | null): Promise<DBChat | null> {
        const dbChats = await getChats(userEmail, false);
        if (!dbChats) {
            return null;
        }

        const eligible = lockedCategory
            ? dbChats.filter(c => c.categoryName === lockedCategory)
            : dbChats;

        if (eligible.length === 0) {
            setActiveChatId(NO_CHAT_ID_LEFT);
            return null;
        }

        const loadedChatRecord: Record<number, DBChat> = {};
        for (const dbChat of eligible) {
            loadedChatRecord[dbChat.id] = dbChat;
        }
        setChatRecord(loadedChatRecord);

        // getChats is sorted asc by creationTime; the last element is the most
        // recent — use it as the active chat.
        const activeChat = eligible[eligible.length - 1];
        setActiveChatId(activeChat.id);
        return activeChat;
    };
    
    // Looks up the next chat template and creates a new chat from it
    async function newChat(userEmail: string,
                           category?: string): Promise<DBChat | null> {
        const chatTemplate = await getChatTemplate(userEmail, category);
        if (!chatTemplate) {
            console.log(`No unused chat template found${category ? ` for category '${category}'` : ''}`);
            if (!category) setActiveChatId(NO_ACTIVE_CHAT_ID);
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
        console.log("New chat created");

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
        console.log("Next problem selected");
    }

    // Selects the previous problem
    const prevProblem = () => {
        if (problems.length === 0) {
            return;
        }

        const currIndex = problems.findIndex(problem => problem.problemId === activeProblemId);
        if (currIndex <= 0) {
            return; // Already on first problem
        }
        const prevProblemId = problems[currIndex - 1].problemId;
        setActiveProblemId(prevProblemId);
        console.log("Previous problem selected");
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
            isAdmin   : session.user.isAdmin ?? false,
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
                categories           = {categories}
                selectedCategory     = {selectedCategory}
                switchToCategory     = {switchToCategory}
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
                           categories              = {categories}
                           selectedCategory        = {selectedCategory}
                           switchToCategory        = {switchToCategory}
                           onNextProblem           = {nextProblem}
                           onPrevProblem           = {prevProblem}
                           onAllCompleted          = {endSession}
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
