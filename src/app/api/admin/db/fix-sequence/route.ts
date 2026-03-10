// Library imports
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Custom imports
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import { fixModelSequence, fixAllSequences } from '@/util/CSVUtil';
import { MODEL_NAMES, type ModelName } from '@/util/ModelRegistry';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const body = await req.json() as { model?: ModelName };
        
        if (body.model) {
            if (!MODEL_NAMES.includes(body.model)) {
                return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
            }
            const result = await fixModelSequence(body.model);
            return NextResponse.json({ results: [result] });
        }
        
        // Fix all sequences
        const results = await fixAllSequences();
        return NextResponse.json({ results });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
