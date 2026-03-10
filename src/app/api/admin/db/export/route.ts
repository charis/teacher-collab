// Library imports
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
// Custom imports
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import { exportModelToCsv } from '@/util/CSVUtil';
import { MODEL_NAMES, type ModelName } from '@/util/ModelRegistry';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    
    const model = req.nextUrl.searchParams.get('model') as ModelName | null;
    if (!model || !MODEL_NAMES.includes(model)) {
        return new Response(JSON.stringify({ error: 'Invalid model' }), { status: 400 });
    }
    
    try {
        const csv = await exportModelToCsv(model);
        if (!csv) {
            return new Response(JSON.stringify({ error: `No data in ${model}` }), { status: 404 });
        }
        
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="export-${model}.csv"`,
            },
        });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: msg }), { status: 500 });
    }
}
