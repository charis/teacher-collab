// Library imports
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// Custom imports
import { CachedDBPersona } from '@/types'; // adjust import paths

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
}

export async function POST(req: NextRequest) {
    const { messages, embeddedPersonas }: {
        messages        : string;
        embeddedPersonas: CachedDBPersona[];
    } = await req.json();
    
    if (!messages || messages.length === 0 || !embeddedPersonas || embeddedPersonas.length === 0) {
        return NextResponse.json({ error: 'Missing required input' }, { status: 400 });
    }
    
    const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: messages,
    });
    
    // Compute weighted embedding of all message embeddings
    const weightedEmbedding = weightedAverageVectors(embeddingRes.data.map(d => d.embedding));
    
    // Compute similarity scores and log them
    const scoredPersonas = embeddedPersonas.map((persona) => {
        const score = cosineSimilarity(weightedEmbedding, persona.embedding);
        console.log(`Score for persona "${persona.name}" (ID: ${persona.personaId}): ${score.toFixed(4)}`);
        return { persona, score };
    });
    
    // Sort by descending similarity and pick the best match
    const result = scoredPersonas.sort((a, b) => b.score - a.score)[0];
    
    return NextResponse.json({ bestPersona: result.persona });
}

/**
 * Computes a weighted average of multiple vectors, where the first vector 
 * receives a weight of 0.6, and the remaining vectors evenly split the 
 * remaining 0.4 weight.
 *
 * @param vectors - An array of vectors (arrays of numbers) of equal length
 * 
 * @returns a single vector representing the weighted average
 *
 * @example
 * const vectors = [
 *   [1, 2, 3],  // Will receive 60% weight
 *   [4, 5, 6],  // Will share 40% with any other remaining vectors
 *   [7, 8, 9]
 * ];
 * const result = weightedAverageVectors(vectors);
 * // result is a single vector with the weighted average
 */
function weightedAverageVectors(vectors: number[][]): number[] {
    const numOfVectors = vectors.length;
    if (numOfVectors === 0) {
        return [];
    }
    
    const weights = new Array(numOfVectors).fill(0);
    weights[0] = 0.6;
    
    if (numOfVectors > 1) {
        const remainingWeight = 0.4;
        const eachWeight = remainingWeight / (numOfVectors - 1);
        for (let i = 1; i < numOfVectors; i++) {
            weights[i] = eachWeight;
        }
    }
    
    const length = vectors[0].length;
    const result = new Array(length).fill(0);
    
    for (let i = 0; i < numOfVectors; i++) {
        const weight = weights[i];
        const vector = vectors[i];
        for (let j = 0; j < length; j++) {
            result[j] += vector[j] * weight;
        }
    }
    
    return result;
}
