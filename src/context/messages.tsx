// Library imports
import { createContext, useState } from 'react';
// Custom imports
import { generateId } from "@/util/ChatUtil";
import { ChatMessage, MessageContextType, Role } from "@/types";


type ProvidersProps = {
    children  : React.ReactNode;
    personaId?: string; 
};

export const MessagesContext = createContext<MessageContextType>({
    // Fallback values (i.e., values that the message context will fall back to
    // if no values are provided)
    messages            : [],
    addMessage          : () => {},
    removeMessage       : () => {},
    updateMessage       : () => {},
    isMessageUpdating   : false,
    setIsMessageUpdating: () => {},
    replaceMessages     : () => {}
});


/**
 * Messages-provider wrapper
 */
const MessagesProvider:React.FC<ProvidersProps> = ({children, personaId}) => {
    /** Keeps track if the message is updating */
    const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false);

    /** Stores the messages */
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id       : generateId(), // Create random id
            role     : Role.ASSISTANT,
            personaId: personaId || null,
            name     : null,
            text     : 'Hello, how can I help you?'
        }
    ]);

    /**
     * Adds a new message.
     * 
     * @param message The message to add
     */
    const addMessage = (message: ChatMessage) => {
        // Append the new message to the previous messages
        setMessages((prev) => [...prev, message]);
    };

    /**
     * Removes the message with the given id.
     * 
     * @param id The id of the message to remove
     */
    const removeMessage = (id: number) => {
        // Append the new message to the previous messages
        setMessages((prev) => prev.filter((message) => message.id !== id));
    };

    /**
     * Updates the text for the message with the given id.
     * 
     * @param {number}   id       - The id of the message to update its text
     * @param {Function} updateFn - The function that updates the current text of the message
     */
    const updateMessage = (id      : number,
                           updateFn: (currText: string) => string) => {
        setMessages((prev) => prev.map((message) => {
            if (message.id === id) {
                // If this is the message we want to update, call the update
                // function with the message.text as argument
                return {...message, text: updateFn(message.text)};
            }

            return message;
        }));
    };
    
    /**
     * Replaces the messages with new messages.
     * 
     * @param newMessages The new messages
     */
    const replaceMessages = (newMessages: ChatMessage[]) => {
        setMessages(newMessages);
    };
      
    return (
        <MessagesContext.Provider value={{
            messages,
            addMessage,
            removeMessage,
            updateMessage,
            isMessageUpdating,
            setIsMessageUpdating,
            replaceMessages
        }}>
            {children}
        </MessagesContext.Provider>
    );
}
export default MessagesProvider;