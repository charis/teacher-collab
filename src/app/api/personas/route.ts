// Library imports
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import OpenAI from 'openai';
// Custom imports
import { DBPersona } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const { personas }: { personas: DBPersona[] } = await req.json();
        
        if (!personas || personas.length === 0) {
            return NextResponse.json({ error: 'No personas provided' }, { status: 400 });
        }
        
        const inputs = personas.map(persona => persona.initialMessage);
        
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: inputs,
        });
        
        const cachedPersonas = personas.map((persona, index) => ({
            ...persona,
            embedding: embeddingRes.data[index].embedding,
        }));
        
        return NextResponse.json({ cachedPersonas });
    }
    catch (error) {
        console.error('Error in /api/personas:', error);
        const errorMessage = error instanceof Error ?
                             error.message : 'Unknown error getting the persona embeddings';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
