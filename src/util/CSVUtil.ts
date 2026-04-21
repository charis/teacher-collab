/**
 * Shared CSV import/export and sequence-fix utilities for the admin Database
 * Management modal. Adapted from prisma/scripts/export-to-csv.ts,
 * import-from-csv.ts, and fix-postgres-sequence.ts.
 */
// Library imports
import { z } from 'zod';
// Custom imports
import prismaInstance from '@/app/lib/prisma';
import { ModelName } from '@/util/ModelRegistry';

// CSV values arrive as raw strings. `boolFromCSV` calls `Boolean(v)`,
// which makes any non-empty string (including "false") truthy — so we parse
// "true"/"false" strings explicitly. Empty strings pass through as
// `undefined` so `.optional().default(...)` can take over.
const boolFromCSV = z.preprocess((v) => {
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === '')      return undefined;
        if (s === 'true')  return true;
        if (s === 'false') return false;
    }
    return v;
}, z.boolean());

/**
 * Fetches all records for the given model, including any relations needed
 * for CSV export (e.g., Problem includes personas and transcripts).
 *
 * @param modelName - The Prisma model to query
 *
 * @returns all records for the model as plain objects
 */
async function fetchAllRecords(modelName: ModelName):
      Promise<Record<string,
                     string | number | boolean | Date | object | null>[]> {
    switch (modelName) {
        case 'Category':
             return prismaInstance.category.findMany();

        case 'User':
             return prismaInstance.user.findMany();

        case 'Persona':
             return prismaInstance.persona.findMany();
        
        case 'Problem':
             return prismaInstance.problem.findMany({
                include: { personas: true, transcripts: true }
             });
        
        case 'Transcript':
             return prismaInstance.transcript.findMany({
                include: { problem: true }
             });
        
        case 'Chat':
             return prismaInstance.chat.findMany();
        
        case 'LearningSequence':
             return prismaInstance.learningSequence.findMany();
        
        case 'Message':
             return prismaInstance.message.findMany();
        
        case 'ChatTemplate':
             return prismaInstance.chatTemplate.findMany();
        
        case 'ChatTemplateProblem':
             return prismaInstance.chatTemplateProblem.findMany();
        
        case 'Settings':
             return prismaInstance.settings.findMany();
        
        case 'SettingsSwitch':
             return prismaInstance.settingsSwitch.findMany();

        default: {
            const exhaustiveCheck: never = modelName;
            throw new Error(`Unknown model: ${exhaustiveCheck}`);
        }
    }
}

// ========================================================================== //
//                           C S V   P A R S I N G                            //
// ========================================================================== //
/**
 * Parses a CSV string into an array of row objects keyed by column headers.
 * Handles quoted fields (including fields that contain commas and newlines).
 * Empty values and the literal string {@code "null"} are both converted to
 * {@code null}.
 *
 * @param csvText - The raw CSV text (including the header row)
 *
 * @returns An array of objects where each key is a column header and each
 *          value is the cell content as a string or {@code null}
 */
export function parseCsvString(csvText: string): Record<string, string | null>[] {
    const rows: Record<string, string | null>[] = [];
    const lines = parseCsvLines(csvText);
    
    if (lines.length < 2) {
        return rows; // Need at least header + 1 data row
    }
    
    const headers = lines[0];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i];
        const row: Record<string, string | null> = {};
        
        for (let j = 0; j < headers.length; j++) {
            const raw = (values[j] ?? '').trim();
            row[headers[j]] = (!raw || raw.toLowerCase() === 'null') ? null : raw;
        }
        
        rows.push(row);
    }
    
    return rows;
}

/**
 * Low-level CSV line parser that handles quoted fields correctly.
 * Supports escaped quotes ({@code ""}) and fields that span multiple lines.
 *
 * @param text - The raw CSV text
 *
 * @returns A two-dimensional array where each inner array represents one row
 *          and contains the individual field strings for that row
 */
function parseCsvLines(text: string): string[][] {
    const result: string[][] = [];
    let current = '';
    let inQuotes = false;
    let row: string[] = [];
    
    for (let i = 0; i < text.length; i++) {
        const currChar = text[i];
        
        if (inQuotes) {
            if (currChar === '"') {
                // Check for escaped quote ""
                if (i + 1 < text.length && text[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                current += currChar;
            }
        }
        else {
            if (currChar === '"') {
                inQuotes = true;
            }
            else if (currChar === ',') {
                row.push(current);
                current = '';
            }
            else if (currChar === '\n') {
                row.push(current);
                current = '';
                if (row.length > 1 || row[0] !== '') {
                    result.push(row);
                }
                row = [];
            }
            else if (currChar === '\r') {
                // Skip carriage return
            }
            else {
                current += currChar;
            }
        }
    }
    
    // Push last field/row
    if (current || row.length > 0) {
        row.push(current);
        if (row.length > 1 || row[0] !== '') {
            result.push(row);
        }
    }
    
    return result;
}

// ========================================================================== //
//                             C S V   E X P O R T                            //
// ========================================================================== //
/**
 * Exports all records for a single Prisma model to a CSV-formatted string.
 * Relations are flattened: {@code Problem.personas} becomes a JSON array of
 * persona IDs, and {@code Transcript.problem} is omitted entirely.
 * Null values are serialised as the literal string {@code "null"}, dates as
 * ISO-8601 strings, and arrays/objects as JSON strings.
 *
 * @param modelName - The name of the Prisma model to export
 *                    (e.g., {@code 'User'}, {@code 'Problem'})
 *
 * @returns A CSV string whose first row contains column headers followed by
 *          one row per record, or an empty string if the model has no data
 */
export async function exportModelToCsv(modelName: ModelName): Promise<string> {
    const data = await fetchAllRecords(modelName);
    
    if (!data.length) {
        return '';
    }
    
    // Flatten each record
    const flattenedData = data.map((record) => {
        const flat: Record<string, string> = {};
        
        for (const key in record) {
            const value = record[key];
            
            // Skip transcripts for Problem (exported via Transcript model)
            if (modelName === 'Problem' && key === 'transcripts') {
                continue;
            }
            
            // Problem.personas -> JSON array of personaId strings
            if (modelName === 'Problem' && key === 'personas' && Array.isArray(value)) {
                flat.personas = JSON.stringify(
                    value.map((p: { personaId: string }) => p.personaId)
                );
                continue;
            }
            
            // Skip Transcript.problem relation object
            if (modelName === 'Transcript' && key === 'problem') {
                continue;
            }
            
            if (value === null) {
                flat[key] = 'null';
            }
            else if (value instanceof Date) {
                flat[key] = value.toISOString();
            }
            else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                flat[key] = JSON.stringify(value);
            }
            else {
                flat[key] = String(value);
            }
        }
        
        return flat;
    });
    
    // Build CSV string
    const headers = Object.keys(flattenedData[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of flattenedData) {
        const values = headers.map((header) => {
            const val = row[header] ?? '';
            // Quote fields that contain commas, quotes, or newlines
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// ========================================================================== //
//                             C S V   I M P O R T                            //
// ========================================================================== //
/** 
 * Result summary returned by {@link importCsvRows}.
 */
export type ImportResult = {
    /** Number of rows that were successfully upserted */
    success : number;
    /** Number of rows that were skipped due to validation or FK errors */
    skipped : number;
    /** Human-readable error messages for the skipped rows */
    errors  : string[];
};

/**
 * Imports an array of pre-parsed CSV rows into the specified Prisma model.
 * Each row is validated with a model-specific Zod schema, foreign-key
 * references are checked, and the row is upserted. Rows that fail
 * validation or FK checks are skipped (not thrown), and their error
 * messages are collected in the returned {@link ImportResult}.
 *
 * @param modelName - The name of the Prisma model to import into
 * @param rows      - Parsed CSV rows (as returned by {@link parseCsvString})
 *
 * @returns An {@link ImportResult} with counts of successful imports,
 *          skipped rows, and any error messages
 */
export async function importCsvRows(modelName: ModelName,
                                    rows     : Record<string, string | null>[]):
             Promise<ImportResult> {
    const result: ImportResult = { success: 0, skipped: 0, errors: [] };
    
    for (const row of rows) {
        try {
            await importSingleRow(modelName, row);
            result.success++;
        }
        catch (err: unknown) {
            result.skipped++;
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(msg);
        }
    }
    
    return result;
}

/**
 * Validates and upserts a single CSV row into the database.
 * The logic mirrors prisma/scripts/import-from-csv.ts with per-model
 * Zod schemas and FK existence checks.
 *
 * @param modelName - The Prisma model to import into
 * @param row       - A single parsed CSV row
 *
 * @returns Resolves when the row has been upserted successfully
 *
 * @throws Error if the row fails Zod validation or a required FK reference
 *         is missing
 */
async function importSingleRow(modelName: ModelName,
                               row      : Record<string, string | null>):
      Promise<void> {
    switch (modelName) {
        case 'Category': {
            const schema = z.object({
                name: z.string(),
            });
            const data = schema.parse(row);
            await prismaInstance.category.upsert({
                where : { name: data.name },
                update: {},
                create: data,
            });
            break;
        }

        case 'User': {
            const schema = z.object({
                id                       : z.coerce.number(),
                email                    : z.string().email(),
                name                     : z.string(),
                password                 : z.string(),
                isAdmin                  : boolFromCSV,
                isVerified               : boolFromCSV,
                forgotPasswordToken      : z.string().nullable().optional(),
                forgotPasswordTokenExpiry: z.coerce.date().nullable().optional(),
                verifyToken              : z.string().nullable().optional(),
                verifyTokenExpiry        : z.coerce.date().nullable().optional(),
            });
            const data = schema.parse(row);
            const { id, ...userData } = data;
            await prismaInstance.user.upsert({
                where : { email: userData.email },
                update: userData,
                create: { id, ...userData },
            });
            break;
        }
        
        case 'Persona': {
            const schema = z.object({
                id            : z.coerce.number(),
                personaId     : z.string(),
                name          : z.string(),
                gender        : z.string(),
                description   : z.string(),
                initialMessage: z.string(),
                instructions  : z.string().nullable().optional(),
                skills        : z.string().nullable().optional(),
                categoryName  : z.string(),
            });
            const data = schema.parse(row);
            const { id, ...personaData } = data;
            await prismaInstance.persona.upsert({
                where : { personaId: personaData.personaId },
                update: personaData,
                create: { id, ...personaData },
            });
            break;
        }

        case 'Settings': {
            const schema = z.object({
                id                     : z.coerce.number(),
                global_instructions    : z.string().nullable().optional(),
                categoryName           : z.string().nullable().optional(),
                registerAsAdminPassword: z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            const { id, ...settingsData } = data;
            await prismaInstance.settings.upsert({
                where : { id },
                update: settingsData,
                create: { id, ...settingsData },
            });
            break;
        }
        
        case 'SettingsSwitch': {
            const schema = z.object({
                id               : z.coerce.number(),
                settingsId       : z.coerce.number(),
                isEnabled        : boolFromCSV.optional().default(true),
                isMutualExclusive: boolFromCSV.optional().default(false),
                selectedOptionIndex: z.coerce.number().nullable().optional(),
                option1_label    : z.string().nullable().optional(),
                option1          : z.string().nullable().optional(),
                option2_label    : z.string().nullable().optional(),
                option2          : z.string().nullable().optional(),
                option3_label    : z.string().nullable().optional(),
                option3          : z.string().nullable().optional(),
                option4_label    : z.string().nullable().optional(),
                option4          : z.string().nullable().optional(),
                option5_label    : z.string().nullable().optional(),
                option5          : z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            
            const existing = await prismaInstance.settings.findUnique({
                where: { id: data.settingsId },
            });
            if (!existing) {
                throw new Error(`Parent settingsId ${data.settingsId} not found`);
            }
            
            const { id, ...switchData } = data;
            await prismaInstance.settingsSwitch.upsert({
                where : { id },
                update: switchData,
                create: { id, ...switchData },
            });
            break;
        }
        
        case 'Problem': {
            const schema = z.object({
                id              : z.coerce.number(),
                problemId       : z.string(),
                title           : z.string(),
                text            : z.string().nullable().optional(),
                imageURL        : z.string().nullable().optional(),
                imageDescription: z.string().nullable().optional(),
                agentNotes      : z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            const { id, ...problemData } = data;
            
            // Handle personas many-to-many
            const personasField = row.personas;
            let personaConnect: { personaId: string }[] = [];
            if (personasField) {
                try {
                    const personaIds = JSON.parse(personasField);
                    if (Array.isArray(personaIds)) {
                        const valid = await prismaInstance.persona.findMany({
                            where : { personaId: { in: personaIds } },
                            select: { personaId: true },
                        });
                        personaConnect = valid.map((p: { personaId: string }) => ({ personaId: p.personaId }));
                    }
                } catch {
                    // Skip persona relation on parse error
                }
            }
            
            await prismaInstance.problem.upsert({
                where : { problemId: problemData.problemId },
                update: problemData,
                create: { id, ...problemData },
            });
            
            if (personaConnect.length) {
                await prismaInstance.problem.update({
                    where: { problemId: problemData.problemId },
                    data : { personas: { set: personaConnect } },
                });
            }
            break;
        }
        
        case 'Transcript': {
            const schema = z.object({
                id              : z.coerce.number(),
                problemId       : z.string(),
                text            : z.string().nullable().optional(),
                imageURL        : z.string().nullable().optional(),
                imageDescription: z.string().nullable().optional(),
                agentNotes      : z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            
            const existing = await prismaInstance.problem.findUnique({
                where: { problemId: data.problemId },
            });
            if (!existing) {
                throw new Error(`Problem ${data.problemId} not found`);
            }
            
            const { id, ...transcriptData } = data;
            await prismaInstance.transcript.upsert({
                where : { id },
                update: transcriptData,
                create: { id, ...transcriptData },
            });
            break;
        }
        
        case 'ChatTemplate': {
            const schema = z.object({
                id          : z.coerce.number(),
                name        : z.string(),
                categoryName: z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            const { id, ...rest } = data;
            await prismaInstance.chatTemplate.upsert({
                where : { id },
                update: rest,
                create: { id, ...rest },
            });
            break;
        }
        
        case 'ChatTemplateProblem': {
            const schema = z.object({
                id            : z.coerce.number(),
                chatTemplateId: z.coerce.number(),
                problemId     : z.string(),
                order         : z.coerce.number(),
            });
            const data = schema.parse(row);
            
            const tmpl = await prismaInstance.chatTemplate.findUnique({
                where: { id: data.chatTemplateId },
            });
            if (!tmpl) {
                throw new Error(`ChatTemplate ${data.chatTemplateId} not found`);
            }
            
            const problem = await prismaInstance.problem.findUnique({
                where: { problemId: data.problemId },
            });
            if (!problem) {
                throw new Error(`Problem ${data.problemId} not found`);
            }
            
            await prismaInstance.chatTemplateProblem.upsert({
                where : { id: data.id },
                update: {
                    chatTemplateId: data.chatTemplateId,
                    problemId     : data.problemId,
                    order         : data.order,
                },
                create: {
                    id            : data.id,
                    chatTemplateId: data.chatTemplateId,
                    problemId     : data.problemId,
                    order         : data.order,
                },
            });
            break;
        }
        
        case 'Chat': {
            const schema = z.object({
                id          : z.coerce.number(),
                userId      : z.coerce.number(),
                completed   : boolFromCSV.optional().default(false),
                creationTime: z.string().optional(),
                updateTime  : z.string().optional(),
                templateId  : z.coerce.number().nullable().optional(),
                categoryName: z.string().nullable().optional(),
            });
            const data = schema.parse(row);
            const { id, creationTime, updateTime, ...rest } = data;
            
            const chatData = {
                ...rest,
                creationTime: creationTime ? new Date(creationTime) : new Date(),
                updateTime  : updateTime ? new Date(updateTime) : new Date(),
            };
            
            if (chatData.templateId) {
                const tmpl = await prismaInstance.chatTemplate.findUnique({
                    where: { id: chatData.templateId },
                });
                if (!tmpl) {
                    throw new Error(`ChatTemplate ${chatData.templateId} not found`);
                }
            }
            
            await prismaInstance.chat.upsert({
                where : { id },
                update: chatData,
                create: { id, ...chatData },
            });
            break;
        }
        
        case 'LearningSequence': {
            const schema = z.object({
                chatId        : z.coerce.number(),
                transcriptId  : z.coerce.number(),
                whiteboardData: z.string().nullable().optional(),
            });
            const data = schema.parse(row);

            let whiteboardData = null;
            if (data.whiteboardData) {
                try { whiteboardData = JSON.parse(data.whiteboardData); }
                catch { /* skip invalid JSON */ }
            }

            await prismaInstance.learningSequence.upsert({
                where: {
                    chatId_transcriptId: {
                        chatId      : data.chatId,
                        transcriptId: data.transcriptId,
                    },
                },
                update: { whiteboardData },
                create: {
                    chatId        : data.chatId,
                    transcriptId  : data.transcriptId,
                    whiteboardData,
                },
            });
            break;
        }
        
        case 'Message': {
            const schema = z.object({
                id          : z.coerce.number().optional(),
                chatId      : z.coerce.number(),
                problemId   : z.string().nullable().optional(),
                transcriptId: z.coerce.number().nullable().optional(),
                agentId     : z.string().nullable().optional(),
                personaId   : z.string().nullable().optional(),
                text        : z.string(),
                role        : z.string(),
                agentMode   : z.string().nullable().optional(),
                creationTime: z.string().optional(),
                updateTime  : z.string().optional(),
            });
            const data = schema.parse(row);
            
            // Verify LearningSequence exists if transcriptId is provided
            if (data.transcriptId) {
                const learningSequence = await prismaInstance.learningSequence.findUnique({
                    where: {
                        chatId_transcriptId: {
                            chatId      : data.chatId,
                            transcriptId: data.transcriptId,
                        },
                    },
                });
                if (!learningSequence) {
                    throw new Error(
                        `LearningSequence (chatId=${data.chatId}, transcriptId=${data.transcriptId}) not found`
                    );
                }
            }
            
            if (data.personaId) {
                const persona = await prismaInstance.persona.findUnique({
                    where: { personaId: data.personaId },
                });
                if (!persona) {
                    throw new Error(`Persona ${data.personaId} not found`);
                }
            }
            
            const messageData = {
                chatId      : data.chatId,
                problemId   : data.problemId ?? null,
                transcriptId: data.transcriptId ?? null,
                agentId     : data.agentId ?? null,
                personaId   : data.personaId ?? null,
                text        : data.text,
                role        : data.role,
                agentMode   : data.agentMode ?? null,
                creationTime: data.creationTime ? new Date(data.creationTime) : new Date(),
                updateTime  : data.updateTime ? new Date(data.updateTime) : new Date(),
            };
            
            if (data.id) {
                await prismaInstance.message.upsert({
                    where : { id: data.id },
                    update: messageData,
                    create: { id: data.id, ...messageData },
                });
            }
            else {
                await prismaInstance.message.create({ data: messageData });
            }
            break;
        }
    }
}

// ========================================================================== //
//                           S E Q U E N C E   F I X                          //
// ========================================================================== //
/**
 * Models that have auto-increment sequences paired with their Postgres column names.
 */
const SEQUENCE_TARGETS: Array<[ModelName, string]> = [
    ['User',                '_id'],
    ['Persona',             '_id'],
    ['Problem',             '_id'],
    ['Transcript',          '_id'],
    ['Chat',                '_id'],
    ['Message',             '_id'],
    ['ChatTemplate',        'id'],
    ['ChatTemplateProblem', 'id'],
    ['Settings',            'id'],
    ['SettingsSwitch',      'id'],
];

/**
 * Validates that a table or column identifier contains only safe characters.
 *
 * @param name - The identifier to validate
 *
 * @returns The original name if it passes validation
 *
 * @throws Error if {@code name} contains characters other than letters,
 *         digits, or underscores
 */
function sanitizeName(name: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`Invalid name: "${name}"`);
    }
    return name;
}

/**
 * Fixes the Postgres auto-increment sequence for a single model so that
 * the next generated ID is one greater than the current maximum.
 * This prevents P2002 unique-constraint errors after a bulk CSV import.
 *
 * @param modelName - The name of the Prisma model whose sequence to fix
 *
 * @returns A human-readable status message describing the outcome
 *          (e.g., {@code "Fixed sequence for Chat._id"} or
 *          {@code "No sequence for LearningSequence"})
 */
export async function fixModelSequence(modelName: ModelName): Promise<string> {
    const target = SEQUENCE_TARGETS.find(([m]) => m === modelName);
    if (!target) {
        return `No sequence for ${modelName}`;
    }
    
    const [table, column] = target;
    const safeTable  = sanitizeName(table);
    const safeColumn = sanitizeName(column);
    
    const seqRows: { seq_name: string | null }[] = await prismaInstance.$queryRawUnsafe(
        `SELECT pg_get_serial_sequence('"${safeTable}"', '${safeColumn}') AS seq_name;`
    );
    const seqName = seqRows[0]?.seq_name;
    
    if (!seqName) {
        return `No sequence found for ${safeTable}.${safeColumn}`;
    }
    
    await prismaInstance.$executeRawUnsafe(
        `SELECT setval('${seqName}', `
      + `COALESCE((SELECT MAX("${safeColumn}") FROM "${safeTable}"), 0) + 1, `
      + `false);`
    );
    
    return `Fixed sequence for ${safeTable}.${safeColumn}`;
}

/**
 * Fixes the auto-increment sequences for every model that has one.
 * Models with composite primary keys (e.g., {@code LearningSequence}) are
 * skipped automatically.
 *
 * @returns An array of human-readable status messages, one per model
 */
export async function fixAllSequences(): Promise<string[]> {
    const results: string[] = [];
    for (const [model] of SEQUENCE_TARGETS) {
        const msg = await fixModelSequence(model);
        results.push(msg);
    }
    return results;
}
