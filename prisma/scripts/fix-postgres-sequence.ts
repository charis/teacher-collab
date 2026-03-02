// Library imports
import 'dotenv/config';
// Custom imports
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Validates and sanitizes a table/column identifier to avoid accidental SQL injection.
 *
 * Only letters (A–Z, a–z), digits (0–9) and underscore (_) are allowed.
 *
 * @param name - The identifier to validate (table or column name)
 * 
 * @returns the original name if it passes validation
 * 
 * @throws an error if `name` contains any characters other than letters, digits, or underscores.
 */
function sanitizeName(name: string) {
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`Invalid name: "${name}". Only letters, digits and underscores are allowed.`);
    }
    return name;
}

/**
 * Fixes the Postgres sequence for a table/column, if one exists.
 * Queries `pg_get_serial_sequence(modelName, columnName)` and, if a sequence is found,
 * runs `setval(sequence, COALESCE((SELECT MAX(columnName) FROM modelName), 0) + 1, false)`.
 * If no sequence exists (pg_get_serial_sequence returns NULL) the function logs and returns.
 *
 * Important:
 * - Run this **outside** any active transaction.
 * - The DB user must have permission to call `pg_get_serial_sequence` / `setval`.
 * - `modelName` and `columnName` are validated; invalid names will cause an exception.
 *
 * @param modelName  - The table name (e.g. "Chat")
 * @param columnName - The column name (e.g. "_id" or "id")
 * 
 * @throws an error if `modelName` or `columnName` fail validation, or if SQL execution fails
 */
async function fixSequence(modelName : string,
                           columnName: string) {
    modelName  = sanitizeName(modelName);
    columnName = sanitizeName(columnName);
    
    try {
        // Ask Postgres for the sequence name (NULL if none)
        const seqQuery = `
            SELECT pg_get_serial_sequence('"${modelName}"', '${columnName}') AS seq_name;
        `;
        // $queryRawUnsafe returns an array of rows for Postgres
        const seqRows: any[] = await prisma.$queryRawUnsafe(seqQuery);
        const seqName: string | null = Array.isArray(seqRows) && seqRows.length ?
                                       seqRows[0].seq_name : null;
        
        if (!seqName) {
            console.log("No sequence found for table \"" + modelName
                      + "\", column \"" + columnName + "\" — skipping.");
            return;
        }
        
        console.log(`Found sequence for "${modelName}"."${columnName}": ${seqName}`);
        // Use the sequence name returned by pg_get_serial_sequence directly in setval
        const setvalSql = `SELECT setval('${seqName}', `
                        + `COALESCE((SELECT MAX("${columnName}") FROM "${modelName}"), 0) + 1,`
                        + `false);`;
        await prisma.$executeRawUnsafe(setvalSql);
        
        console.log(`Sequence fix completed for "${modelName}"."${columnName}".`);
    }
    catch (err: unknown) {
        if (err instanceof Error) {
            console.error(`Error fixing sequence for ${modelName}.${columnName}: ${err.message}`);
        }
        else {
            console.error(`Unknown error fixing sequence for ${modelName}.${columnName}:`, err);
        }
    }
}

async function main() {
    try {
        // Only call fixSequence for model/column pairs that are intended to
        // have serial Primary Keys based on our schema, these map to _id
        // (mapped columns) or id (unmapped)
        const targets: Array<[string, string]> = [
            ['User',                '_id'],
            ['Persona',             '_id'],
            ['Problem',             '_id'],
            ['Transcript',          '_id'],
            ['Chat',                '_id'],
            // LearningSequence has no single-column serial id -> it will be skipped safely.
            ['Message',             '_id'],
            // The following models use an "id" column (not mapped to _id) — include them with 'id'
            ['ChatTemplate',        'id'],
            ['ChatTemplateProblem', 'id'],
            ['Settings',            'id'],
            ['SettingsSwitch',      'id'],
        ];
        
        for (const [model, column] of targets) {
            await fixSequence(model, column);
        }
    }
    catch (error) {
        console.error('Unexpected error in main():', error);
        process.exitCode = 1;
    }
    finally {
        await prisma.$disconnect();
    }
}

main();
