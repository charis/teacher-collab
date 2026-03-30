// Library imports
import { NextRequest, NextResponse } from 'next/server';
// Custom imports
import { getWhiteboardData, saveWhiteboardData } from '@/util/DBUtil';
import { WhiteboardData } from '@/types';

/**
 * GET /api/whiteboard?chatId=X&transcriptId=Y
 *
 * Loads the persisted whiteboard data for a learning sequence.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const chatId       = Number(searchParams.get('chatId'));
    const transcriptId = Number(searchParams.get('transcriptId'));

    if (isNaN(chatId) || isNaN(transcriptId)) {
        return NextResponse.json({ error: 'Invalid chatId or transcriptId' },
                                 { status: 400 });
    }

    const data = await getWhiteboardData(chatId, transcriptId);
    return NextResponse.json({ whiteboardData: data });
}

/**
 * PUT /api/whiteboard
 *
 * Saves whiteboard data for a learning sequence. Expected to be called
 * with debouncing from the client (e.g., 1.5 s after last change).
 */
export async function PUT(request: NextRequest) {
    const body: {
        chatId        : number;
        transcriptId  : number;
        whiteboardData: WhiteboardData;
    } = await request.json();

    const { chatId, transcriptId, whiteboardData } = body;

    if (!chatId || !transcriptId || !whiteboardData) {
        return NextResponse.json({ error: 'Missing required fields' },
                                 { status: 400 });
    }

    await saveWhiteboardData(chatId, transcriptId, whiteboardData);
    return NextResponse.json({ success: true });
}
