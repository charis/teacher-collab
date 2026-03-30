// Library imports
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DESCRIBE_PROMPT =
    'Describe this educational image in detail. Focus on: ' +
    '(1) any mathematical content, equations, or number relationships, ' +
    '(2) diagrams, drawings, or visual representations, ' +
    '(3) any student work or handwriting visible, ' +
    '(4) any text labels or instructions. ' +
    'Be specific about quantities, positions, and relationships. ' +
    'This description will be used to give an AI teaching agent context about the image.';

/**
 * POST /api/admin/describeImage
 *
 * Sends an image URL to GPT-4o for a detailed educational description.
 * Used to populate the {@code imageDescription} field on Problem/Transcript.
 */
export async function POST(request: NextRequest) {
    const { imageURL }: { imageURL: string } = await request.json();

    if (!imageURL) {
        return NextResponse.json({ error: 'imageURL is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
        model   : 'gpt-4o',
        messages: [
            {
                role   : 'user',
                content: [
                    { type: 'text', text: DESCRIBE_PROMPT },
                    { type: 'image_url', image_url: { url: imageURL } }
                ]
            }
        ],
        max_tokens: 1000
    });

    const description = response.choices[0]?.message?.content?.trim() ?? '';

    if (!description) {
        return NextResponse.json({ error: 'No description generated' }, { status: 500 });
    }

    return NextResponse.json({ description });
}
