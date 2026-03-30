// Library imports
import { NextRequest, NextResponse } from 'next/server';
// Custom imports
import { getWhiteboardData, saveWhiteboardData } from '@/util/DBUtil';
import type { WhiteboardData } from '@/types';

/**
 * POST /api/whiteboard/draw
 *
 * Merges new Excalidraw elements into the existing whiteboard for a learning
 * sequence. Used by AI agents to add drawings programmatically.
 */
export async function POST(request: NextRequest) {
    const body: {
        chatId      : number;
        transcriptId: number;
        elements    : Record<string, unknown>[];
    } = await request.json();

    const { chatId, transcriptId, elements } = body;

    if (!chatId || !transcriptId || !Array.isArray(elements) || elements.length === 0) {
        return NextResponse.json({ error: 'Missing required fields' },
                                 { status: 400 });
    }

    // Load existing whiteboard data
    const existing = await getWhiteboardData(chatId, transcriptId);
    const existingElements = existing?.elements ?? [];

    // Merge: append new elements to existing ones
    const merged: WhiteboardData = {
        elements: [...existingElements, ...elements]
    };

    await saveWhiteboardData(chatId, transcriptId, merged);
    return NextResponse.json({ success: true, totalElements: merged.elements.length });
}
