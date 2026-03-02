// Custom imports
import { useEffect, useRef } from 'react';
import { ChatMessages } from "@/components/chatbot/ChatMessages";
import MessagesProvider from "@/context/messages";
import { ScrollArea } from "@/components/teacher/ui/scroll-area";
import { CachedDBPersona,
         ChatMessage,
         DBProblem,
         DBTranscript,
         Settings } from "@/types";
import "@/styles/react-tabs.css";

interface ChatWindowProps {
    username            : string | null;
    settings            : Settings | null;
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

export function ChatWindow({ username,
                             settings,
                             activeAgentId,
                             currProblem,
                             currTranscript,
                             messages,
                             setMessages,
                             updateMessages,
                             saveMessage,
                             setResponseMessage,
                             currEmbeddedPersonas }: ChatWindowProps) {
    const messageEndRef = useRef<HTMLDivElement>(null);
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    // Scroll to the bottom of the messages
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    return (
      <MessagesProvider personaId = {currEmbeddedPersonas[0]?.personaId}>
        <ScrollArea className="px-0 py-4 h-[calc(100vh-94px)] overflow-y-auto">
          <div className="w-full">
            <div className="text-white font-medium">
                <div className="w-auto bg-white border border-gray-400 rounded-md overflow-hidden">
                  <ChatMessages className            = "px-2 py-3"
                                username             = {username}
                                settings             = {settings}
                                activeAgentId        = {activeAgentId}
                                currProblem          = {currProblem}
                                currTranscript       = {currTranscript}
                                messages             = {messages}
                                setMessages          = {setMessages}
                                updateMessages       = {updateMessages}
                                saveMessage          = {saveMessage}
                                setResponseMessage   = {setResponseMessage}
                                currEmbeddedPersonas = {currEmbeddedPersonas}
                  />
                  <div ref={messageEndRef} />
                </div>
            </div>
          </div>
        </ScrollArea>
      </MessagesProvider>
    );
};