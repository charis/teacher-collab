"use client";

// Library imports
import TextareaAutosize from 'react-textarea-autosize';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { HTMLAttributes } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import 'core-js/stable'; // npm install core-js@latest
import 'regenerator-runtime/runtime'; // npm install regenerator-runtime@latest
// Custom imports
import { cn } from "@/util/utils";
import { generateId, sendMessageWithStreaming } from "@/util/ChatUtil";
import { SpeechUtil } from "@/util/SpeechUtil";
import { CachedDBPersona,
         ChatMessage,
         DBProblem,
         DBTranscript,
         Role,
         Settings } from "@/types";

interface ChatInputProps extends HTMLAttributes<HTMLDivElement> {
    settings            : Settings | null;
    activeAgentId       : string | null;
    currProblem         : DBProblem | null;
    currTranscript      : DBTranscript | null;
    messages            : ChatMessage[];
    setMessages         : React.Dispatch<React.SetStateAction<
                                               Record<number | string, ChatMessage[]>>>;
    saveMessage         : (message            : ChatMessage,
                           problemId          : string | null,
                           transcriptOrAgentId: number | string,) => Promise<void>;
    setResponseMessage  : (message            : ChatMessage,
                           transcriptOrAgentId: number | string,
                           text               : string | null) => void;
    currEmbeddedPersonas: CachedDBPersona[];
};

export function ChatInput({ className,
                            settings,
                            activeAgentId,
                            currProblem,
                            currTranscript,
                            messages,
                            setMessages,
                            saveMessage,
                            setResponseMessage,
                            currEmbeddedPersonas,
                            ...props }: ChatInputProps) {
    const [input, setInput] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const inputRef = useRef(input);
    
    // Speech recognition
    const { transcript, listening } = useSpeechRecognition();
    
    // ----------------------   u s e E f f e c t ( )   --------------------- //
    // Update the ref whenever input changes
    useEffect(() => {
        inputRef.current = input;
    }, [input]);
    
    useEffect(() => {
        if (!listening) {
            const updatedTranscript = inputRef.current.length > 0 ?
                                      inputRef.current + ' ' + transcript : transcript;
            setInput(updatedTranscript);
        }
    }, [listening, setInput, transcript]);
    
    const {mutate: sendMessage, isPending} = useMutation({
        mutationFn: async ({ userMessage }: { userMessage: ChatMessage }) => {
            sendMessageWithStreaming(userMessage,
                                     settings,
                                     null, // selected persona === null => auto-select the persona
                                     activeAgentId ?? null,
                                     currProblem,
                                     currTranscript,
                                     messages,
                                     setMessages,
                                     saveMessage,
                                     setResponseMessage,
                                     true, // Save the user message to the DB
                                     currEmbeddedPersonas);
        },
        
        onSuccess: async () => {
            // Clean up
            setInput('');
            textareaRef.current?.focus();
        },
        
        onError() {
            textareaRef.current?.focus();
        }
    });
    
    // Sends the user input to the bot
    const handleSendUserInput = () => {
        if (!input.trim()) {
            return; // Ignore empty messages
        }
        
        if (settings?.speech) {
            // Stop playback only (do not abort incoming response stream).
            SpeechUtil.getInstance().startNewStream();
        }
        
        const userMessage = {
            id       : generateId(),
            role     : Role.USER,
            personaId: null,
            name     : null,
            text     : input
        };
        
        sendMessage({ userMessage });
    };
    
    return (
        <div {...props} className={cn('border-t border-zinc-300', className)}>
          {/*   S P E E C H    R E C O G N I T I O N   */}
          <div className="items-center mt-2">
            <div className="flex items-center">
              <Image src="/images/microphone.png"
                     alt="Microphone"
                     height={25}
                     width={25}
              />
              <div className={`${listening ? 'text-green-600' : 'text-red-600'}`}>{listening? 'On' : 'Off'}</div>
              <div className="mx-1 cursor-pointer" onClick={() => SpeechRecognition.startListening()}>
                <Image src="/images/start.png"
                       alt="Start Speech Recignition"
                       height={25}
                       width={25}
                />
              </div>
              <div className="mx-1 rounded-lg cursor-pointer" onClick={() => SpeechRecognition.stopListening()}>
                <Image src="/images/stop.png"
                       alt="Stop Speech Recignition"
                       height={25}
                       width={25}
                />
              </div>
              <div className="mx-1 rounded-lg cursor-pointer" onClick={() => setInput('')}>
                <Image src   ="/images/delete.png"
                       alt   ="Clear input"
                       height={25}
                       width ={25}
                />
              </div>
            </div>
          </div>
          <div className="relative mt-4 flex-1 overflow-hidden rounded-sm border-none outline-none">
            <TextareaAutosize className  ={`peer disabled:opacity-50 pr-14 resize-none block w-full
                                           border-1 border-black bg-zinc-100 py-2.5 text-gray-900
                                           focus:border-blue-600 focus:border-2 focus:outline-none
                                           focus:ring-0 text-sm sm:leading-6`}
                              ref        ={textareaRef}
                              rows       ={2}
                              maxRows    ={4}
                              onKeyDown  ={(e) => {
                                  // Pressing just <Enter> means send the question
                                  // Pressing <Enter> + <Shift> means move to new line
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                       // Prevent reloading + Send the question
                                       e.preventDefault();
                                       handleSendUserInput();
                                  }
                              }}
                              value      ={input}
                              autoFocus
                              disabled   ={isPending}
                              onChange   ={(e) => setInput(e.target.value)}
                              placeholder="Type your message..."
            />
            
            {/* Loading indicator */}
            <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
              <kbd className="inline-flex items-center bg-white border-gray-500
                              px-1 font-sans text-xs text-gray-400">
                {isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div onClick  ={handleSendUserInput} 
                       className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                )}
              </kbd>
            </div>
          </div>
        </div>
    );
};