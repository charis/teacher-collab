/**
 * @fileoverview
 * Export all models in the Prisma schema to separate CSV files.
 * Each model is saved in `prisma/exports/export-<Model>.csv`.
 * Uses `csv-writer` for structured export and Prisma Client for data access.
 *
 * To run:
 *    npx ts-node prisma/export-to-csv.ts
 */
// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

const prismaClient = new PrismaClient();

/**
 * Valid model names from your Prisma schema.
 * Used to type-check dynamic access to Prisma client.
 */
const VALID_MODELS = [
    'User',
    'Persona',
    'Problem',
    'Transcript',
    'Chat',
    'LearningSequence',
    'Message',
    'ChatTemplate',
    'ChatTemplateProblem',
    'SettingsSwitch',
    'Settings'
] as const;

type ModelName = typeof VALID_MODELS[number];


/**
 * Define relations to include when fetching model data.
 */
const MODEL_INCLUDES: Record<string, any> = {
    Problem: {
        personas: true,
        transcripts: true,
    },
    Transcript: {
        problem: true,
    },
}

/**
 * Directory to store CSV export files.
 */
const exportFolder = path.resolve(__dirname, '..', 'exports');

/**
 * Export data from a single Prisma model to a CSV file.
 *
 * @param {ModelName} modelName - The name of the Prisma model to export
 * 
 * @returns {Promise<void>} A promise that resolves when the file is written
 */
async function exportModel(modelName: ModelName): Promise<void> {
    const model   = (prismaClient as any)[modelName];
    const include = MODEL_INCLUDES[modelName] || undefined;
    const data    = await model.findMany({ include });
    
    if (!data.length) {
        console.log(`⚠️  No data in ${modelName}`);
        return;
    }
    
    const filePath = path.join(exportFolder, `export-${modelName}.csv`);
    
    // Flatten relation data (e.g., convert personas[] into JSON strings)
    const flattenedData = data.map((record) => {
        const flat = {};
        
        for (const key in record) {
            const value = record[key];
            
            // 1) Skip transcripts entirely for Problem
            if (modelName === 'Problem' && key === 'transcripts') {
                continue;
            }
            
            // 2) Special-case: Problem.personas -> array of personaId strings
            if (modelName === 'Problem' && key === 'personas' && Array.isArray(value)) {
                flat.personas = JSON.stringify(value.map((persona) => persona.personaId));
                continue;
            }
            
            // 3) Transcript.problem -> SKIP entirely (do not export relation object)
            if (modelName === 'Transcript' && key === 'problem') {
                continue;
            }
                        
            // 4) Preserve explicit nulls as the literal string "null"
            if (value === null) {
                flat[key] = 'null';
                continue;
            }
            
            // 5) Dates -> ISO string
            if (value instanceof Date) {
                flat[key] = value.toISOString();
                continue;
            }
            
            // 6) Arrays / Objects -> JSON string (handles nested objects)
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                flat[key] = JSON.stringify(value);
                continue;
            }
            
            // 7) Primitive values -> copy directly (undefined will be left out)
            //    If value is undefined, csv-writer will render an empty cell.
            flat[key] = value;
        }
        
        return flat;
    });
    
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Object.keys(flattenedData[0]).map((key) => ({
            id   : key,
            title: key,
        })),
    });
    
    await csvWriter.writeRecords(flattenedData);
    console.log(`✅ Exported ${data.length} rows from ${modelName} → ${filePath}`);
}

/**
 * Ensure the output directory exists.
 */
function ensureExportDirectory(): void {
    if (!fs.existsSync(exportFolder)) {
        fs.mkdirSync(exportFolder, { recursive: true });
    }
}

/**
 * Export all models defined in VALID_MODELS to CSV files.
 */
async function main(): Promise<void> {
    try {
        ensureExportDirectory();
        
        for (const modelName of VALID_MODELS) {
            await exportModel(modelName);
        }
        
        console.log('🏁 All exports complete.');
    }
    catch (error) {
        console.error('❌ Error exporting models:', error);
    }
    finally {
        await prismaClient.$disconnect();
    }
}

main();
