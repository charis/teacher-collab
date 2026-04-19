"use client";

// Library imports
import { useEffect, useMemo, useState } from 'react';
import PQueue  from 'p-queue';
import Image from 'next/image';
// Custom imports
import { MainWindow } from "@/components/MainWindow";
import { Sidebar } from "@/components/Sidebar";
import { generateId } from "@/util/ChatUtil";
import { createMessage,
         deleteMessage,
         updateMessage } from "@/util/DBUtil";
import { ChatMessage,
         DBChat,
         DBLearningSequence,
         DBMessage,
         DBPersona,
         Role,
         Settings } from "@/types";
import { NO_ACTIVE_CHAT_ID } from "@/constants";

interface ChatInterfaceProps {
    username               : string | null;
    sidebarOpen            : boolean;
    settings               : Settings | null;
    chatRecord             : Record<number, DBChat>;
    setChatRecord          : React.Dispatch<React.SetStateAction<Record<number, DBChat>>>;
    activeChatId           : number;
    setActiveChatId        : React.Dispatch<React.SetStateAction<number>>;
    activeProblemId        : string | null;
    setActiveProblemId     : React.Dispatch<React.SetStateAction<string | null>>;
    activeTranscriptId     : number | null;
    setActiveTranscriptId  : React.Dispatch<React.SetStateAction<number | null>>;
    categories             : string[];
    selectedCategory       : string | null;
    switchToCategory       : (category: string | null) => Promise<void>;
    onNextProblem          : () => void;
    onPrevProblem          : () => void;
    onAllCompleted         : () => void;
}
        
export function ChatInterface({ username,
                                sidebarOpen,
                                settings,
                                chatRecord,
                                setChatRecord,
                                activeChatId,
                                setActiveChatId,
                                activeProblemId,
                                setActiveProblemId,
                                activeTranscriptId,
                                setActiveTranscriptId,
                                categories,
                                selectedCategory,
                                switchToCategory,
                                onNextProblem,
                                onPrevProblem,
                                onAllCompleted }: ChatInterfaceProps) {
    // ---------------------------   S T A T E   ---------------------------- //
    // activeChatMessages => key: transcriptId / value: ChatMessage[]
    const [activeChatMessages,    setActiveChatMessages]    = useState<Record<number, ChatMessage[]>>({});
    // activeChatMessages => key: personaId / value: ChatMessage[]
    const [meetAgentChatMessages, setMeetAgentChatMessages] = useState<Record<string, ChatMessage[]>>({});
    const [activeAgent,           setActiveAgent]           = useState<DBPersona | null>(null);
    const [chatMsgToDBMsgMap,     setChatMsgToDBMsgMap]     = useState<Map<number, number>>(
                                                                         new Map<number, number>());
    const taskQueue = new PQueue({ concurrency: 5 }); // Limit to 5 concurrent operations
    
    // ----------------------------   M E M O   ----------------------------- //
    // Memoize to keep the same reference unless chatRecord or activeChatId changes
    const learningSequences = useMemo(() => {
        return chatRecord[activeChatId]?.learningSequences ?? [];
    }, [chatRecord, activeChatId]);
    
    /**
     * Determines whether a learning sequence has reached the required number of
     * user interactions and should be considered "complete".
     *
     * Encoding of completion:
     * - Counts only messages where msg.role === Role.USER.
     * - If Fixed Agent mode is enabled and the problem has more than one persona,
     *   the required minimum interactions is (numOfPersonas + 1) * MIN_INTERACTIONS.
     * - Otherwise the required minimum interactions is MIN_INTERACTIONS.
     *
     * @param seq - learning sequence object containing `messages` and `transcript`
     *
     * @returns {@code true} if the sequence meets or exceeds the required number
     *          of user messages or {@code false} otherwise
     */
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    useEffect(() => {
        const activeChat = chatRecord[activeChatId];
        if (activeChat) {
            setMessages(activeChat);
        }
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChatId]);
    

    /**
     * Initializes the in-memory chat messages for both transcript-based and
     * meet-with-agent chats.
     * Ensures that in-memory IDs are unique across both transcript and meet-agent
     * messages and preserves a mapping to database IDs for later updates or
     * deletions.
     * 
     * @param activeChat - The DBChat object containing learning sequences and 
     *                     meet-agent chats
     */
    function setMessages(activeChat: DBChat) {
        const numOfSequences = activeChat.learningSequences.length;
        const messageRecord: Record<number, ChatMessage[]> = {};
        
        // Use a single counter so generated IDs are unique across both transcript and agent messages
        let counter = 0;
        
        // Collect new mappings (inMemoryId -> dbId) here and merge once at the end
        const newMappings = new Map<number, number>();
        
        // --------------------------- //
        //  Build transcript messages  //
        // --------------------------- //
        for (const learningSequence of activeChat.learningSequences) {
            const transcriptId = learningSequence.transcript.id;
            messageRecord[transcriptId] = [];
            
            // Sort the messages chronologically (i.e., by creation id)
            const sortedMessages = [...learningSequence.messages].sort(
                (a, b) => a.id - b.id
            );
            
            for (const dbMessage of sortedMessages) {
                const messageId = generateId() + counter++;
                const chatMessage: ChatMessage = {
                    id       : messageId,
                    role     : dbMessage.role as Role,
                    personaId: dbMessage.persona !== null? dbMessage.persona.personaId : null,
                    name     : dbMessage.persona !== null? dbMessage.persona.name : null,
                    text     : dbMessage.text
                };
                messageRecord[transcriptId].push(chatMessage);
                
                // Collect mapping instead of mutating state directly
                newMappings.set(messageId, dbMessage.id);
            }
        }
        
        // Write transcript messages state
        setActiveChatMessages(messageRecord);
        setActiveChatId(activeChat.id);
        
        if (numOfSequences > 0) {
            setActiveTranscriptId(activeChat.learningSequences[0].transcript.id);
        }
        
        // --------------------------- //
        //  Build meet-agent messages  //
        // --------------------------- //
        const meetAgentMessageRecord: Record<string, ChatMessage[]> = {};
        for (const [agentId, dbMessages] of Object.entries(activeChat.meetAgentChats ?? {})) {
            const chatMessages: ChatMessage[] = [];
            
            for (const dbMessage of dbMessages) {
                const messageId = generateId() + counter++;
                const chatMessage: ChatMessage = {
                    id       : messageId,
                    role     : dbMessage.role as Role,
                    personaId: dbMessage.persona?.personaId ?? null,
                    name     : dbMessage.persona?.name ?? null,
                    text     : dbMessage.text
                };
                chatMessages.push(chatMessage);
                
                // Collect mapping
                newMappings.set(messageId, dbMessage.id);
            }
            meetAgentMessageRecord[agentId] = chatMessages;
        }
        
        // Write meet-agent UI state
        setMeetAgentChatMessages(meetAgentMessageRecord);
        
        // Merge collected mappings into the React state map using immutable update
        setChatMsgToDBMsgMap(prev => {
            const merged = new Map(prev);
            for (const [inMemoryId, dbId] of newMappings.entries()) {
                merged.set(inMemoryId, dbId);
            }
            return merged;
        });
    }
    
    /**
     * Computes the `agentMode` string from the current settings switches.
     *
     * The `agentMode` is a concatenated string representing the binary-encoded
     * user selections across all settings switches. Each switch contributes a
     * two-digit decimal value (padded with leading zero if necessary), prepended
     * in ascending order by switch ID.
     *
     * Encoding rules:
     * - For mutual-exclusive switches (`isMutualExclusive === true`), the selected
     *   index (1–5) maps to a bitmask: index 1 → 1 (2⁰), index 2 → 2 (2¹), ...,
     *   index 5 → 16 (2⁴).
     * - For multi-select switches (`isMutualExclusive === false`), multiple indices
     *   may be selected. Each selected index contributes to the bitmask, and the
     *   total value is the sum of all selected bitmasks.
     *
     * Examples:
     * - A mutual-exclusive switch with selection 3 → binary `00100` → decimal `4`.
     * - A multi-select switch with selections [1, 4] → binary `01001` → decimal `9`.
     * - If two such switches exist with IDs 2 and 5, agentMode would be `'0409'`
     *   (value from ID 2: `04`, value from ID 5: `09`).
     *
     * If no settings are available, returns `'0'`.
     *
     * @param settings The full settings state, including UI selections
     * 
     * @returns a string representing the binary-encoded user mode
     */
    function getAgentMode(): string {
        if (settings?.switches) {
            let agentMode = '';
            
            // Sort switches by ascending id
            const sortedSwitches = [...settings.switches].sort((a, b) => a.id - b.id);
            
            for (const currSwitch of sortedSwitches) {
                const { selection, isMutualExclusive } = currSwitch;
                
                let value = 0;
                
                if (isMutualExclusive) {
                    // Single number selection (1–5)
                    if (typeof selection === 'number' && selection >= 1 && selection <= 5) {
                        value = 1 << (selection - 1);
                    }
                }
                else {
                    // Multiple selection (number[])
                    if (Array.isArray(selection)) {
                        for (const selectedOption of selection) {
                            if (selectedOption >= 1 && selectedOption <= 5) {
                                value += 1 << (selectedOption - 1);
                            }
                        }
                    }
                }
                
                // Always pad to two digits for consistency
                agentMode = value.toString().padStart(2, '0') + agentMode;
            }
            
            return agentMode;
        }
        else {
            return '0';
        }
    }
    
    /**
     * Adds a message to the chat record and the database.
     * 
     * @param message             - The message to add
     * @param problemId           - The problem ID to which the message belongs or
     *                              {@code null} if this is a meet-with-agent message
     * @param transcriptOrAgentId - The transcript ID to which the message belongs
     *                              or the agent ID if this a meet-with-agent message
     */
    const handleAddMessage = async(message            : ChatMessage,
                                   problemId          : string | null,
                                   transcriptOrAgentId: number | string) => {
        if (activeChatId === NO_ACTIVE_CHAT_ID) {
            // Create a new chat
            console.error("No active chat ID");
            return;
        }
        
        const activeChat = chatRecord[activeChatId];
        if (!activeChat) { // Should never happen, but just in case...
            console.error("No active chat");
            return;
        }
        
        taskQueue.add(async () => {
            // Step 1: Update the DB (i.e., add message to the DB)
            const agentMode = message.role === Role.ASSISTANT? getAgentMode() : null;
            const [dbMessage, _] = await createMessage(activeChat.id,
                                                       problemId,
                                                       transcriptOrAgentId,
                                                       message.text,
                                                       message.role,
                                                       agentMode,
                                                       message.personaId);
            if (!dbMessage) {
                console.error("Error creating a " + message.role
                            + "-message in the database for text: " + message.text);
                return;
            }
            
            // Step 2: Update the chat record (i.e., add message to the chat record)
            const meetWithAgent = typeof transcriptOrAgentId === "string";
            
            if (meetWithAgent) {
                const agentId = transcriptOrAgentId;
                
                setChatRecord(prev => {
                    const prevChat = prev[activeChat.id];
                    
                    const updatedChat: DBChat = {
                        ...prevChat,
                        meetAgentChats: {
                            ...(prevChat.meetAgentChats ?? {}),
                            [agentId]: [...(prevChat.meetAgentChats?.[agentId] ?? []), dbMessage]
                        },
                        updateTime: dbMessage.updateTime
                    };
                    
                    return {
                        ...prev,
                        [prevChat.id]: updatedChat
                    };
                });
                
                // Update meet-agent UI state (dedupe + rebuild)
                /*
                setMeetAgentChatMessages(prev => {
                    const prevList = prev[agentId] ?? [];
                    
                    // Build the UI message
                    const chatMessageForUI: ChatMessage = {
                        id       : message.id, // keep original in-memory id
                        role     : dbMessage.role as Role,
                        personaId: dbMessage.persona?.personaId ?? null,
                        name     : dbMessage.persona?.name ?? null,
                        text     : dbMessage.text,
                    };
                    
                    const idx = prevList.findIndex(msg => msg.id === chatMessageForUI.id);
                    if (idx !== -1) {
                        // Replace the existing optimistic message with updated fields (stable id)
                        const newList = [...prevList];
                        newList[idx] = { ...newList[idx], ...chatMessageForUI };
                        return { ...prev, [agentId]: newList };
                    }
                    
                    // No optimistic message found — append (rare)
                    return {
                        ...prev,
                        [agentId]: [...prevList, chatMessageForUI]
                    };
                });
                */
            }
            else {
                // Append dbMessage to the matching learningSequence and updateTime — NO defensive checks.
                setChatRecord(prev => {
                    const prevChat = prev[activeChat.id];
                    
                    const updatedChat: DBChat = {
                        ...prevChat,
                        learningSequences: prevChat.learningSequences.map(seq =>
                            seq.transcript.id === transcriptOrAgentId ? {
                                ...seq,
                                messages: [...seq.messages, dbMessage]
                            } : seq
                        ),
                        updateTime: dbMessage.updateTime
                    };
                    
                    return {
                        ...prev,
                        [activeChat.id]: updatedChat
                    };
                });
            }
            
            // Step 3: Update the mapping from ChatMessage ID -> DB Message ID
            setChatMsgToDBMsgMap(prevMap => {
                const newMap = new Map(prevMap); // clone previous map
                newMap.set(message.id, dbMessage.id); // insert new key-value pair
                return newMap;
            });
        });
    };
    
    /**
     * Updates or removes the last message (in the provided array of messages)
     * from the chat record and the database.
     * Moreover, it removes any subsquent messages in the chat.
     * 
     * @param updatedMessages     - The array with the messages to keep. The last
     *                              message array is the one to update (if
     *                              {@code text} is not {@code null} or remove (if
     *                              {@code text} not {@code null}).
     * @param problemId           - The problem ID to which the message belongs or
     *                              {@code null} if this is a meet-with-agent message
     * @param transcriptOrAgentId - The transcript ID to which the {@code updatedMessages}
     *                              belong or the agent ID if the {@code updatedMessages}
     *                              are meet-with-agent message
     * @param text                - The message text to update or {@code null} to remove
     *                              the last message in the {@code updatedMessages}
     */
    const updateMessages = async(updatedMessages       : ChatMessage[],
                                 problemId             : string | null,
                                 transcriptOrAgentId   : number | string,
                                 text                  : string | null) => {
        const activeChat = chatRecord[activeChatId];
        if (!activeChat) {
            console.error("No active chat found for id:", activeChatId);
            return;
        }
        
        if (updatedMessages.length === 0) {
            console.error("No messages to update or remove");
            return;
        }
        
        const meetWithAgent = typeof transcriptOrAgentId === "string";
        
        let existingMessages: DBMessage[];
        let learningSequence: DBLearningSequence | undefined;
        
        if (meetWithAgent) {
            existingMessages = activeChat.meetAgentChats[transcriptOrAgentId] ?? [];
            
            if (!existingMessages || existingMessages.length === 0) {
                console.error("No meet-agent messages to update or remove for agent: ",
                              transcriptOrAgentId);
                return;
            }
        }
        else {
            learningSequence = activeChat.learningSequences.find(
                seq => seq.transcript.id === transcriptOrAgentId
            );
            
            if (!learningSequence) {
                console.error(`No learning sequence found for problemId: ${problemId}`);
                return;
            }
            
            existingMessages = learningSequence.messages;
            if (!existingMessages || existingMessages.length === 0) {
                console.error("No messages to update or remove");
                return;
            }
        }
        
        const lastMessageToUpdate = updatedMessages[updatedMessages.length - 1];
        const dbMessageId = chatMsgToDBMsgMap.get(lastMessageToUpdate.id);
        if (dbMessageId === undefined) {
            console.error("Found no id in the database for chat message with id="
                        + lastMessageToUpdate.id);
            return;
        }
       
        // Find the index of the message to update/remove
        let indexToUpdateOrRemove = -1;
        for (let i = existingMessages.length - 1; i >= 0; i--) {
            if (existingMessages[i].id === dbMessageId) {
                indexToUpdateOrRemove = i;
                break;
            }
        }
        
        if (indexToUpdateOrRemove === -1) {
            console.error(`Message ${text !== null? "update" : "remove"} not found in active chat`);
            return;
        }
        
        // The indexToUpdateOrRemove marks the starting point for deleting messages (i.e.,
        // we will delete all messages from indexToUpdateOrRemove + 1 till messages.length)
        // If text is null, we will remove the message with indexToUpdateOrRemove as well.
        // Otherwise, we will update it.
        // Now remove the messages from the database
        for (let i = existingMessages.length - 1; i > indexToUpdateOrRemove; i--) {
            await deleteMessage(existingMessages[i].id);
        }
        
        // Determine updated chat messages
        const updatedChatMessages = text === null? updatedMessages.slice(0, -1) : updatedMessages;
        if (meetWithAgent) {
            setMeetAgentChatMessages(prev => ({
                ...prev,
                [transcriptOrAgentId]: updatedChatMessages
            }));
        }
        else {
            setActiveChatMessages(prev => ({
                ...prev,
                [transcriptOrAgentId]: updatedChatMessages
            }));
        }
        
        let updatedMessage: DBMessage | null = null;
        const messageId = existingMessages[indexToUpdateOrRemove].id;
        if (text !== null) {
            const messageToUpdate = existingMessages[indexToUpdateOrRemove];
            const agentMode = messageToUpdate.role === Role.ASSISTANT? getAgentMode() : null;
            const [dbMessage, error] = await updateMessage(activeChatId,
                                                           messageId,
                                                           text,
                                                           agentMode);
            if (!dbMessage) {
                console.error("Error updating the message in the database: ", error);
            }
            else{
                updatedMessage = dbMessage;
            }
        }
        else {
            await deleteMessage(messageId);
        }
        
        // Update the chat record (i.e., update the chat that we delete the message from
        // by removing that message from the messages)
        const newMessages = existingMessages.slice(0, indexToUpdateOrRemove);
        if (updatedMessage !== null) {
            // Append the updated message to the newMessages
            newMessages.push(updatedMessage);
        }
        
        if (meetWithAgent) {
            setChatRecord(prev => ({
                ...prev,
                [activeChatId]: {
                    ...prev[activeChatId],
                    meetAgentChats : {
                        ...(prev[activeChatId].meetAgentChats ?? {}),
                        [transcriptOrAgentId]: newMessages
                    }
                }
            }));
        }
        else {
            setChatRecord(prev => ({
                ...prev,
                [activeChatId]: {
                    ...prev[activeChatId],
                    learningSequences: prev[activeChatId].learningSequences.map(seq => {
                        if (seq.transcript.id === transcriptOrAgentId) {
                            return {
                                ...seq,
                                messages: newMessages
                            };
                        }
                        return seq;
                    })
                }
            }));
        }
    };
    
    /**
     * Updates the message state for either:
     * 1) A transcript (keyed by {@code number}) using {@code activeChatMessages}
     * 2) An agent persona (keyed by {@code string}) using {@code meetAgentChatMessages}
     *
     * @param message             - The ChatMessage instance to append or use for
     *                              updating the last item
     * @param transcriptOrAgentId - The transcript ID (number) or agent ID (string)
     * @param text                - The new text, or {@code null} to append the
     *                              message instead
     */
    const setResponseMessage = (message            : ChatMessage,
                                transcriptOrAgentId: number | string,
                                text               : string | null) => {
        const meetWithAgent = typeof transcriptOrAgentId === "string";
        
        if (meetWithAgent) {
            // Update activeChatMessages (keys are numbers)
            setMeetAgentChatMessages(prevMessages => {
                const messages = prevMessages[transcriptOrAgentId] ?? [];
                const updatedMessages = updateMessagesHelper(messages, message, text);
                
                return {
                    ...prevMessages,
                    [transcriptOrAgentId]: updatedMessages
                };
            });
        }
        else {
            // Update activeChatMessages (keys are numbers)
            setActiveChatMessages(prevMessages => {
                const messages = prevMessages[transcriptOrAgentId] ?? [];
                const updatedMessages = updateMessagesHelper(messages, message, text);
                
                return {
                    ...prevMessages,
                    [transcriptOrAgentId]: updatedMessages
                };
            });
        }
    }

    /**
     * Updates an array of ChatMessage objects after either appending a new
     * message or updating the last message's text.
     * - If {@code text} is {@code null}, a new message is appended.
     * - If {@code text} is not {@code null} and the array is non-empty, the
     *   text of the last message is replaced
     * - If {@code text} is not {@code null} and the array is empty, the array
     *   is returned unchanged.
     *
     * @param messages - The existing messages
     * @param message  - The ChatMessage instance to append or use for updating
     *                   the last item
     * @param text     - The replacement text or {@code null} to append
     * 
     * @returns a new array of ChatMessage objects representing the updated state
     */
    function updateMessagesHelper(messages: ChatMessage[],
                                  message : ChatMessage,
                                  text    : string | null): ChatMessage[] {
        if (text === null) {
            // Append new message
            return [...messages, message];
        }
        if (messages.length === 0) {
            // Nothing to update
            return messages;
        }
        
        return [
            ...messages.slice(0, -1),
            { ...messages[messages.length - 1], text }
        ];
    }
    
    return (
      <div className="flex flex-grow min-h-0 bg-gray-100">
        <Sidebar activeChat            = {chatRecord[activeChatId]}
                 activeProblemId       = {activeProblemId}
                 setActiveProblemId    = {setActiveProblemId}
                 setActiveTranscriptId = {setActiveTranscriptId}
                 activeAgent           = {activeAgent}
                 setActiveAgent        = {setActiveAgent}
                 isOpen                = {sidebarOpen}
                 settings              = {settings}
                 categories            = {categories}
                 selectedCategory      = {selectedCategory}
                 switchToCategory      = {switchToCategory}
        />
        
        <div className="flex flex-col flex-grow">
          <div className="flex-grow overflow-auto p-4 min-h-0">
            {(activeChatId !== NO_ACTIVE_CHAT_ID) &&
            <MainWindow username              = {username}
                        settings              = {settings}
                        activeChatId          = {activeChatId}
                        learningSequences     = {learningSequences}
                        activeAgent           = {activeAgent}
                        activeProblemId       = {activeProblemId}
                        activeTranscriptId    = {activeTranscriptId}
                        setActiveTranscriptId = {setActiveTranscriptId}
                        messages              = {activeAgent === null?
                                                 activeChatMessages[activeTranscriptId!] || [] :
                                                 meetAgentChatMessages[activeAgent.personaId]|| []
                                                }
                        setMessages           = {activeAgent === null?
                                                 setActiveChatMessages : setMeetAgentChatMessages}
                        updateMessages        = {updateMessages}
                        addMessage            = {handleAddMessage}
                        setResponseMessage    = {setResponseMessage}
                        onNextProblem         = {onNextProblem}
                        onPrevProblem         = {onPrevProblem}
                        onAllCompleted        = {onAllCompleted}
            />
            }
            {(activeChatId === NO_ACTIVE_CHAT_ID) &&
              <div className="flex flex-col items-center justify-center h-full">
                <Image src    = "/images/loading.png"
                       alt    = "Completed learning sequences image"
                       height = {600}
                       width  = {900}
                       priority // This tells Next.js to preload it
                />
              </div>
            }
            {/* {activeChatId === NO_CHAT_ID_LEFT &&
              <div className="flex flex-col items-center justify-center h-full">
                <Image src    = "/images/completed.png"
                       alt    = "Completed learning sequences image"
                       height = {256}
                       width  = {256}
                       priority // This tells Next.js to preload it
                />
                <h1 className="text-2xl font-bold">You completed all learning sequences.</h1>
              </div>
            } */}
          </div>
        </div>
      </div>
    );
}
