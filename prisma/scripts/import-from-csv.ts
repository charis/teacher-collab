/**
 * @fileoverview
 * Import CSV data into a Prisma model.
 *
 * To run:
 *    npx ts-node prisma/import-from-csv.ts User path/to/file.csv
 */
// @ts-nocheck
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { z } from 'zod';

const prismaClient = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
});

const VALID_MODELS = [
    'User',
    'Persona',
    'Problem',
    'Transcript',
    'ChatTemplate',
    'ChatTemplateProblem',
    'Chat',
    'LearningSequence',
    'Message',
    'SettingsSwitch',
    'Settings'
];

const modelName = process.argv[2];
const csvFilePath = process.argv[3];

if (!modelName || !VALID_MODELS.includes(modelName)) {
    console.error(`Please provide a valid model name as argument. Valid: ${VALID_MODELS.join(', ')}`);
    process.exit(1);
}

if (!csvFilePath) {
    console.error('Please provide a path to the CSV file as second argument.');
    process.exit(1);
}

const rows: Record<string, string | null>[] = [];

async function main() {
    try {
        const model = prismaClient[modelName];
        if (!model) {
            throw new Error(`Model ${modelName} not found on Prisma client.`);
        }
        
        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(path.resolve(csvFilePath))
              .pipe(csv())
              .on('data', (data: Record<string, string>) => {
                  const cleanedData: Record<string, string | null> = {};
                  
                  for (const key in data) {
                      const value = data[key]?.trim();
                      cleanedData[key] = (!value || value.toLowerCase() === 'null') ? null : value;
                  }
                  
                  rows.push(cleanedData);
              })
              .on('end', resolve)
              .on('error', reject);
        });
        
        console.log(`Read ${rows.length} rows from CSV.`);
        
        for (const row of rows) {
            let data: any = row;
            
            // Handle field transformation for User
            if (modelName === 'User') {
                const userSchema = z.object({
                    id                       : z.coerce.number(),
                    email                    : z.string().email(),
                    name                     : z.string(),
                    password                 : z.string(),
                    isAdmin                  : z.coerce.boolean(),
                    isVerified               : z.coerce.boolean(),
                    forgotPasswordToken      : z.string().nullable().optional(),
                    forgotPasswordTokenExpiry: z.coerce.date().nullable().optional(),
                    verifyToken              : z.string().nullable().optional(),
                    verifyTokenExpiry        : z.coerce.date().nullable().optional(),
                });
                
                data = userSchema.parse(row); // throws if data is invalid
                const { id, ...userData } = data;
                
                await model.upsert({
                    where: { email: userData.email },
                    update: userData,            // Don't update the id
                    create: { id, ...userData }, // Create with the same id as in CSV file
                });
            }
            else if (modelName === 'Persona') {
                const personaSchema = z.object({
                    id            : z.coerce.number(),
                    personaId     : z.string(),
                    name          : z.string(),
                    gender        : z.string(),
                    description   : z.string(),
                    initialMessage: z.string(),
                    instructions  : z.string().nullable().optional(),
                });
                
                data = personaSchema.parse(row); // throws if data is invalid
                const { id, ...personaData } = data;
                
                await model.upsert({
                    where : { personaId: personaData.personaId },
                    update: personaData,            // Don't update the id
                    create: { id, ...personaData }, // Create with the same id as in CSV file
                });
            }
            else if (modelName === 'Settings') {
                const settingsSchema = z.object({
                    id                 : z.coerce.number(),
                    global_instructions: z.string().nullable().optional(),
                });
            
                const data = settingsSchema.parse(row);
                const { id, ...settingsData } = data;
            
                await model.upsert({
                    where : { id },
                    update: settingsData,
                    create: { id, ...settingsData },
                });
            }
            else if (modelName === 'SettingsSwitch') {
                const switchSchema = z.object({
                    id                : z.coerce.number(),
                    settingsId        : z.coerce.number(),
                    isEnabled         : z.coerce.boolean().optional().default(true),
                    isMutualExclusive : z.coerce.boolean().optional().default(false),
                    option1_label     : z.string().nullable().optional(),
                    option1           : z.string().nullable().optional(),
                    option2_label     : z.string().nullable().optional(),
                    option2           : z.string().nullable().optional(),
                    option3_label     : z.string().nullable().optional(),
                    option3           : z.string().nullable().optional(),
                    option4_label     : z.string().nullable().optional(),
                    option4           : z.string().nullable().optional(),
                    option5_label     : z.string().nullable().optional(),
                    option5           : z.string().nullable().optional(),
                });
                
                const data = switchSchema.parse(row);
                
                const existingSettings = await prismaClient.settings.findUnique({
                    where: { id: data.settingsId },
                });
                
                if (!existingSettings) {
                    console.warn(`Skipping SettingsSwitch with id ${data.id}: parent settingsId `
                               + `${data.settingsId} not found.`);
                    continue;
                }
                
                const { id, ...switchData } = data;
                
                await model.upsert({
                    where : { id },
                    update: switchData,            // Don't update the id
                    create: { id, ...switchData }, // Create with the same id as in CSV file
                });
            }
            else if (modelName === 'Problem') {
                const problemSchema = z.object({
                    id               : z.coerce.number(),
                    problemId        : z.string(),
                    title            : z.string(),
                    text             : z.string().nullable().optional(),
                    imageURL         : z.string().nullable().optional(),
                    imageDescription : z.string().nullable().optional(),
                    agentNotes       : z.string().nullable().optional()
                });
                
                const data = problemSchema.parse(row);
                const { id, ...problemData } = data;
                
                const personasField = row.personas;
                let personaConnect = [];
                
                if (personasField) {
                    try {
                        const personaIds = JSON.parse(personasField);
                        if (!Array.isArray(personaIds)) {
                            throw new Error("personas field is not an array");
                        }
                        
                        // Validate and fetch matching Persona records
                        const validPersonas = await prismaClient.persona.findMany({
                            where : { personaId: { in: personaIds } },
                            select: { personaId: true },
                        });
                        
                        const validPersonaIds = validPersonas.map(p => p.personaId);
                        
                        personaConnect = validPersonaIds.map(id => ({ personaId: id }));
                    }
                    catch (error) {
                        console.warn(`Skipping persona relation for problemId  `
                                   + `${problemData.problemId }:`, error);
                    }
                }
                
                // Upsert problem without personas
                await model.upsert({
                    where : { problemId: problemData.problemId },
                    update: problemData,            // Don't update the id
                    create: { id, ...problemData }, // Create with the same id as in CSV file
                });
                
                // Update the many-to-many relation explicitly after upsert
                if (personaConnect.length) {
                    await prismaClient.problem.update({
                        where: { problemId: problemData.problemId },
                        data: {
                            personas: {
                                set: personaConnect, // resets and replaces existing links
                            },
                        },
                    });
                }
            }
            else if (modelName === 'Transcript') {
                const transcriptSchema = z.object({
                    id               : z.coerce.number(),
                    problemId        : z.string(),
                    text             : z.string().nullable().optional(),
                    imageURL         : z.string().nullable().optional(),
                    imageDescription : z.string().nullable().optional(),
                    agentNotes       : z.string().nullable().optional()
                });
                
                const data = transcriptSchema.parse(row);
                
                // Ensure referenced Problem exists (by id)
                const existingProblem = await prismaClient.problem.findUnique({
                    where: { problemId: data.problemId },
                });
                
                if (!existingProblem) {
                    console.warn(`Skipping Transcript id=${data.id}: problem id ${data.problemId} not found.`);
                    continue;
                }
                
                const { id, ...transcriptData } = data;
                
                await model.upsert({
                    where : { id },
                    update: transcriptData,
                    create: { id, ...transcriptData },
                });
            }
            else if (modelName === 'ChatTemplate') {
                const chatTemplateSchema = z.object({
                    id  : z.coerce.number(),
                    name: z.string(),
                });
                
                const data = chatTemplateSchema.parse(row);
                const { id, ...chatTemplateData } = data;
                
                await model.upsert({
                    where : { id: id },
                    update: chatTemplateData,            // Don't update the id
                    create: { id, ...chatTemplateData }, // Create with the same id as in CSV file
                });
            }
            else if (modelName === 'ChatTemplateProblem') {
                const chatTemplateProblemSchema = z.object({
                    id            : z.coerce.number(),
                    chatTemplateId: z.coerce.number(),
                    problemId     : z.string(),
                    order         : z.coerce.number(),
                });
                
                const data = chatTemplateProblemSchema.parse(row);
                
                // Verify referenced ChatTemplate exists
                const existingChatTemplate = await prismaClient.chatTemplate.findUnique({
                    where: { id: data.chatTemplateId },
                });
                
                if (!existingChatTemplate) {
                    console.warn(`Skipping ChatTemplateProblem: chatTemplateId ${data.chatTemplateId} does not exist.`);
                    continue;
                }
                
                // Verify referenced Problem exists
                const existingProblem = await prismaClient.problem.findUnique({
                    where: { problemId: data.problemId },
                });
                
                if (!existingProblem) {
                    console.warn(`Skipping ChatTemplateProblem: problem id ${data.problemId} does not exist.`);
                    continue;
                }
                
                await model.upsert({
                    where: { id: data.id },
                    update: { // Don't update the id
                        chatTemplateId: data.chatTemplateId,
                        problemId     : data.problemId,
                        order         : data.order,
                    },
                    create: {
                        id            : data.id,             // Create with the same id as in CSV file
                        chatTemplateId: data.chatTemplateId,
                        problemId     : data.problemId,
                        order         : data.order,
                    },
                });
            }
            else if (modelName === 'Chat') {
                const chatSchema = z.object({
                    id          : z.coerce.number(),
                    userId      : z.coerce.number(),
                    completed   : z.coerce.boolean().optional().default(false),
                    creationTime: z.string().optional(), // will parse to Date below
                    updateTime  : z.string().optional(), // will parse to Date below
                    templateId  : z.coerce.number(),
                });
                
                const data = chatSchema.parse(row);
                const { id, creationTime, updateTime, ...rest } = data;
                
                // Convert date strings to Date objects, or use defaults
                const chatData = {
                    ...rest,
                    creationTime: creationTime ? new Date(creationTime) : new Date(),
                    updateTime  : updateTime ? new Date(updateTime) : new Date(),
                };
                
                const existingTemplate = await prismaClient.chatTemplate.findUnique({
                    where: { id: chatData.templateId }
                });
                
                if (!existingTemplate) {
                    console.warn(`Skipping Chat with id ${id}: templateId ${chatData.templateId} does not exist.`);
                    continue; // skip this chat row, or handle as needed
                }
                
                await model.upsert({
                    where : { id: id },
                    update: chatData,            // Don't update the id
                    create: { id, ...chatData }, // Create with the same id as in CSV file
                });
            }
            else if (modelName === 'LearningSequence') {
                const learningSequenceSchema = z.object({
                    chatId        : z.coerce.number(),
                    transcriptId  : z.coerce.number(),
                    whiteboardData: z.string().nullable().optional(),
                });

                const data = learningSequenceSchema.parse(row);

                let whiteboardData = null;
                if (data.whiteboardData) {
                    try { whiteboardData = JSON.parse(data.whiteboardData); }
                    catch { /* skip invalid JSON */ }
                }

                await model.upsert({
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
            }
            else if (modelName === 'Message') {
                const messageSchema = z.object({
                    id           : z.coerce.number().optional(),
                    chatId       : z.coerce.number(),
                    problemId    : z.string(),
                    transcriptId : z.coerce.number(),
                    personaId    : z.string().nullable().optional(),
                    text         : z.string(),
                    role         : z.string(),
                    agentMode    : z.string().nullable().optional(),
                    creationTime : z.string().optional(),
                    updateTime   : z.string().optional(),
                });
                
                const data = messageSchema.parse(row);
                
                // Verify LearningSequence exists (chatId + problemId)
                const learningSequenceExists = await prismaClient.learningSequence.findUnique({
                    where: {
                        chatId_transcriptId: {
                            chatId      : data.chatId,
                            transcriptId: data.transcriptId,
                        },
                    },
                });
                
                if (!learningSequenceExists) {
                    console.warn(`Skipping Message: LearningSequence (chatId=${data.chatId}, transcriptId=${
                                 data.transcriptId}) does not exist.`);
                    continue;
                }
                
                // Verify personaId exists if provided
                if (data.personaId) {
                    const personaExists = await prismaClient.persona.findUnique({
                        where: { personaId: data.personaId },
                    });
                    if (!personaExists) {
                        console.warn(`Skipping Message: personaId ${data.personaId} does not exist.`);
                        continue;
                    }
                }
                
                const messageData = {
                    chatId       : data.chatId,
                    problemId    : data.problemId,
                    transcriptId : data.transcriptId,
                    personaId    : data.personaId ?? null,
                    text         : data.text,
                    role         : data.role,
                    agentMode    : data.agentMode ?? null,
                    creationTime : data.creationTime ? new Date(data.creationTime) : new Date(),
                    updateTime   : data.updateTime ? new Date(data.updateTime) : new Date(),
                };
              
                if (data.id) {
                    // If id present, upsert by id
                    await model.upsert({
                        where : { id: data.id },
                        update: messageData,                     // Don't update the id
                        create: { id: data.id, ...messageData }, // Create with the same id as in CSV file
                    });
                }
                else {
                    // No id: create new
                    await model.create({ data: messageData });
                }
            }
        }
        
        console.log(`✅ Imported ${rows.length} rows into ${modelName} table.`);
    }
    catch (error) {
        console.error('Failed to import:', error);
    }
    finally {
        await prismaClient.$disconnect();
    }
}

main();
