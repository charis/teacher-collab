// Library imports
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// Custom imports
import prisma from '@/app/lib/prisma';

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
 * Generates a description for an image via GPT-4o vision.
 */
async function describeImage(imageURL: string): Promise<string> {
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
    return response.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * GET /api/imageDescription?type=problem&id=number_trains
 * GET /api/imageDescription?type=transcript&id=5
 *
 * Returns the image description for a Problem or Transcript.
 * If no description exists but an imageURL is present, generates one
 * via GPT-4o vision and saves it to the DB (lazy cache).
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');  // 'problem' or 'transcript'
    const id   = searchParams.get('id');

    if (!type || !id || !['problem', 'transcript'].includes(type)) {
        return NextResponse.json({ error: 'type (problem|transcript) and id are required' },
                                 { status: 400 });
    }

    if (type === 'problem') {
        const problem = await prisma.problem.findUnique({
            where : { problemId: id },
            select: { imageURL: true, imageDescription: true }
        });

        if (!problem?.imageURL) {
            return NextResponse.json({ description: null });
        }

        if (problem.imageDescription) {
            return NextResponse.json({ description: problem.imageDescription });
        }

        // Generate and cache
        const description = await describeImage(problem.imageURL);
        if (description) {
            await prisma.problem.update({
                where: { problemId: id },
                data : { imageDescription: description }
            });
        }
        return NextResponse.json({ description: description || null });
    }

    // type === 'transcript'
    const transcriptId = Number(id);
    if (isNaN(transcriptId)) {
        return NextResponse.json({ error: 'transcript id must be a number' },
                                 { status: 400 });
    }

    const transcript = await prisma.transcript.findUnique({
        where : { id: transcriptId },
        select: { imageURL: true, imageDescription: true }
    });

    if (!transcript?.imageURL) {
        return NextResponse.json({ description: null });
    }

    if (transcript.imageDescription) {
        return NextResponse.json({ description: transcript.imageDescription });
    }

    // Generate and cache
    const description = await describeImage(transcript.imageURL);
    if (description) {
        await prisma.transcript.update({
            where: { id: transcriptId },
            data : { imageDescription: description }
        });
    }
    return NextResponse.json({ description: description || null });
}
