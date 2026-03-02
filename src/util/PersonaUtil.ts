// Custom imports
import type { CachedDBPersona, DBPersona } from '@/types';

/**
 * Get embeddings for DBPersona array and cache them.
 */
export async function getPersonaEmbeddings(personas: DBPersona[]): Promise<CachedDBPersona[]> {
    const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personas: personas }),
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch cached personas: ${response.statusText}`);
    }
    const data = await response.json();
    const cachedPersonas: CachedDBPersona[] = data.cachedPersonas;
    return cachedPersonas;
}

/**
 * Selects the most relevant persona based on cosine similarity between
 * the provided messages and each persona's initial message (system prompt).
 * The first message—typically the user's—has a weight of 0.6, while the
 * remaining messages share the remaining 0.4 weight evenly.
 */
export async function selectBestPersona(messages        : string[],
                                        embeddedPersonas: CachedDBPersona[]):Promise<DBPersona> {
    const response = await fetch('/api/selectBestPersona', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ messages, embeddedPersonas })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to select best persona: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.bestPersona;
}
