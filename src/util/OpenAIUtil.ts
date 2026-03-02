// Libray imports
import { type EventSourceMessage, createParser } from "eventsource-parser";
// Custom imports
import { OpenAIStreamPayload } from "@/types";

export async function createOpenAIStream(payload: OpenAIStreamPayload) {
    const textEncoder = new TextEncoder(); // Encodes the text to send to OpenAI API
    const textDecoder = new TextDecoder(); // Decodes the response from OpenAI
    let counter = 0;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.body) {
        throw new Error("No response body");
    }
    
    const reader = response.body.getReader();
    
    const stream = new ReadableStream({
        async start(controller) {
            const parser = createParser({
                onEvent(event: EventSourceMessage) {
                    if (event.data === '[DONE]') { // We got all the data
                        controller.close(); // Close the stream
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(event.data);
                        const text = json.choices[0].delta?.content || '';
                        
                        // If the text is a prefixed character (e.g., new line) do nothing
                        if (counter < 2 && text.trim() === '') {
                            return;
                        }
                        
                        const queue = textEncoder.encode(text);
                        controller.enqueue(queue);
                        counter++;
                    }
                    catch(error) {
                        controller.error(error);
                    }
                }
            });
            
            // Read chunks in a type-safe way
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                parser.feed(textDecoder.decode(value));
            }
        }
    });
    
    return stream;
}