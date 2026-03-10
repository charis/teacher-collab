// Library imports
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Custom imports
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
import prismaInstance from '@/app/lib/prisma';
import { MODEL_NAMES, MODEL_META, prismaModelName, ModelName } from '@/util/ModelRegistry';

/**
 * Build the Prisma "where" clause for a record based on model's primary key.
 */
function buildWhere(model: ModelName, key: Record<string, unknown>) {
    const meta = MODEL_META[model];
    if (Array.isArray(meta.primaryKey)) {
        // Composite key (e.g., LearningSequence: chatId_transcriptId)
        const compositeKey = meta.primaryKey.join('_');
        const compositeValue: Record<string, unknown> = {};
        for (const k of meta.primaryKey) {
            compositeValue[k] = key[k];
        }
        return { [compositeKey]: compositeValue };
    }
    return { [meta.primaryKey]: key[meta.primaryKey] };
}

/** CREATE */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const { model, data } = await req.json() as {
            model: ModelName;
            data : Record<string, unknown>;
        };
        
        if (!model || !MODEL_NAMES.includes(model)) {
            return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
        }
        
        const prismaModel = (prismaInstance as any)[prismaModelName(model)];
        const record = await prismaModel.create({ data });
        
        return NextResponse.json({ record });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** UPDATE */
export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const { model, key, data } = await req.json() as {
            model: ModelName;
            key  : Record<string, unknown>;
            data : Record<string, unknown>;
        };
        
        if (!model || !MODEL_NAMES.includes(model)) {
            return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
        }
        
        const prismaModel = (prismaInstance as any)[prismaModelName(model)];
        const where  = buildWhere(model, key);
        const record = await prismaModel.update({ where, data });
        
        return NextResponse.json({ record });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** DELETE */
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    try {
        const { model, key } = await req.json() as {
            model: ModelName;
            key  : Record<string, unknown>;
        };
        
        if (!model || !MODEL_NAMES.includes(model)) {
            return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
        }
        
        const prismaModel = (prismaInstance as any)[prismaModelName(model)];
        const where = buildWhere(model, key);
        await prismaModel.delete({ where });
        
        return NextResponse.json({ success: true });
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
