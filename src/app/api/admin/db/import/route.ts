// Library imports
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Custom imports
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import { parseCsvString, importCsvRows } from '@/util/CSVUtil';
import { MODEL_NAMES, ModelName } from '@/util/ModelRegistry';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const formData = await req.formData();
        const model = formData.get('model') as ModelName | null;
        const file  = formData.get('file') as File | null;
        
        if (!model || !MODEL_NAMES.includes(model)) {
            return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
        }
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        
        const csvText = await file.text();
        const rows    = parseCsvString(csvText);
        
        if (!rows.length) {
            return NextResponse.json({ error: 'CSV file is empty or has no data rows' },
                                     { status: 400 });
        }
        
        const result = await importCsvRows(model, rows);
        
        return NextResponse.json(result);
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
