// Library imports
import { NextResponse } from 'next/server';
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
 * Calls GPT-4o to describe a single image URL.
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
 * POST /api/admin/describeAllImages
 *
 * Iterates all Problems and Transcripts with an imageURL but no
 * imageDescription and generates one via GPT-4o vision.
 */
export async function POST() {
    const results: string[] = [];

    // Problems with images but no description
    const problems = await prisma.problem.findMany({
        where: {
            imageURL        : { not: null },
            imageDescription: null
        },
        select: { problemId: true, imageURL: true }
    });

    for (const p of problems) {
        if (!p.imageURL) continue;
        try {
            const description = await describeImage(p.imageURL);
            if (description) {
                await prisma.problem.update({
                    where: { problemId: p.problemId },
                    data : { imageDescription: description }
                });
                results.push(`Problem ${p.problemId}: described`);
            }
        }
        catch (err) {
            results.push(`Problem ${p.problemId}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // Transcripts with images but no description
    const transcripts = await prisma.transcript.findMany({
        where: {
            imageURL        : { not: null },
            imageDescription: null
        },
        select: { id: true, problemId: true, imageURL: true }
    });

    for (const t of transcripts) {
        if (!t.imageURL) continue;
        try {
            const description = await describeImage(t.imageURL);
            if (description) {
                await prisma.transcript.update({
                    where: { id: t.id },
                    data : { imageDescription: description }
                });
                results.push(`Transcript ${t.problemId}/${t.id}: described`);
            }
        }
        catch (err) {
            results.push(`Transcript ${t.problemId}/${t.id}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return NextResponse.json({
        processed: results.length,
        results
    });
}
