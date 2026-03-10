// Library imports
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Custom imports
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import prismaInstance from '@/app/lib/prisma';
import { MODEL_NAMES, MODEL_META, prismaModelName, ModelName } from '@/util/ModelRegistry';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const model    = req.nextUrl.searchParams.get('model') as ModelName | null;
    const page     = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') ?? '50');
    
    if (!model || !MODEL_NAMES.includes(model)) {
        return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }
    
    try {
        const meta = MODEL_META[model];
        const prismaModel = (prismaInstance as any)[prismaModelName(model)];
        
        // Determine orderBy based on primary key
        const orderByField = Array.isArray(meta.primaryKey) ?
                             meta.primaryKey[0] : meta.primaryKey;
        
        const [records, total] = await Promise.all([
            prismaModel.findMany({
                skip   : (page - 1) * pageSize,
                take   : pageSize,
                orderBy: { [orderByField]: 'asc' },
            }),
            prismaModel.count(),
        ]);
        
        return NextResponse.json({ records, total, page, pageSize });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
