"use server"

// Library imports
import prisma from '@/app/lib/prisma';
import { Prisma } from "@prisma/client";
// Install: 'npm i bcrypt' followed by 'npm i --save-dev @types/bcrypt'
import * as bcrypt from 'bcrypt';
// Custom imports
import { DBChat,
         DBChatTemplate,
         DBLearningSequence,
         DBMessage,
         DBPersona,
         DBSettings,
         DBSettingsSwitch ,
         DBProblem,
         DBTranscript,
         DBUser,
         Gender,
         Role,
         WhiteboardData } from "@/types";

// -------------------------------------------------------------------- //
//      P  R  I  S  M  A     P  A  Y  L  O  A  D     T  Y  P  E  S      //
// -------------------------------------------------------------------- //
/**
 * Payload for a Prisma.User to include chats.
 */
type UserWithChats<Order extends 'asc' | 'desc'> = Prisma.UserGetPayload<{
    include: {
        chats: {
            include: {
                learningSequences: {
                    include: {
                        transcript: {
                            include: {
                                problem: {
                                    include: { personas: true }
                                }
                            }
                        },
                        messages: {
                            include: { persona: true },
                            orderBy: { creationTime: Order }
                        }
                    }
                },
                messages: {
                    where: {
                        agentId: { not: null } // Only messages with agentId
                    },
                    include: { persona: true },
                    orderBy: { creationTime: Order }
                }
            };
        };
    };
}>;

/**
 * Payload for a Prisma.Chat to include learningSequences.
 */
type ChatWithLearningSequences<Order extends 'asc' | 'desc'> = Prisma.ChatGetPayload<{
    include: {
        learningSequences: {
            include: {
                transcript: {
                    include: {
                        problem: { include: { personas: true } }
                    }
                },
                messages: {
                    include: { persona: true },
                    orderBy: { creationTime: Order }
                }
            }
        },
        messages: {
            where: {
                agentId: { not: null } // Only messages with agentId
            },
            include: { persona: true },
            orderBy: { creationTime: Order }
        }
    }
}>;

/**
 * Payload for a Prisma.LearningSequence to include transcript messages.
 */
type LearningSequenceWithTranscriptAndMessages = Prisma.LearningSequenceGetPayload<{
    include: {
        transcript: {
            include: {
                problem: {
                    include: { personas: true }
                }
            }
        };
        messages: {
            include: { persona: true }
        };
    };
}>;

/**
 * Payload for a Prisma.Message where the related `persona` relation was eagerly included.
 * Used when Prisma query specified `include: { persona: true }`.
 */
type MessageWithPersonaIncluded = Prisma.MessageGetPayload<{ include: { persona: true } }>;

/**
 * Represents a subset of fields selected from the Prisma.Persona model.
 * 
 * This type defines only the fields required by {@link DBPersona}, avoiding
 * unnecessary data fetching when mapping between database and domain objects.
 */
type SelectedFieldsFromPersona = Prisma.PersonaGetPayload<{
    select: {
        personaId     : true
        name          : true
        gender        : true
        description   : true
        initialMessage: true
        instructions  : true
        skills        : true
        categoryName  : true
    };
}>;

/**
 * Represents a subset of fields selected from the Prisma.Transcript model.
 *
 * This type defines only the fields necessary to construct a
 * {@link DBTranscript}, reducing unnecessary data loading and ensuring
 * type safety when mapping between database and domain models.
 */
type SelectedFieldsFromTranscript = Prisma.TranscriptGetPayload<{
    select: {
        id              : true
        problemId       : true
        text            : true
        imageURL        : true
        imageDescription: true
        agentNotes      : true
    }
}>;

// -------------------------------------------------------- //
//      S  E  A  R  C  H     F  U  N  C  T  I  O  N  S      //
// -------------------------------------------------------- //
/**
 * Retrieves the application settings, including all configuration switches.
 *
 * @returns the settings with their associated switches
 * 
 * @throws when the database query fails
 */
/**
 * Validates a plaintext admin password against the bcrypt hash stored in
 * Settings.registerAsAdminPassword. Returns false if the password is empty
 * or no hash is configured (admin registration disabled).
 */
export async function verifyAdminPassword(plaintext: string): Promise<boolean> {
    if (!plaintext) {
        return false;
    }
    const settings = await prisma.settings.findFirst({
        select: { registerAsAdminPassword: true },
    });
    if (!settings?.registerAsAdminPassword) {
        return false;
    }
    return await bcrypt.compare(plaintext, settings.registerAsAdminPassword);
}

export async function getSettings(): Promise<DBSettings> {
    try {
        const settings = await prisma.settings.findFirst({
            include: { switches: true },
            orderBy: { id: 'asc' }
        });
        
        if (!settings) {
            throw new Error("Settings not found in the database.");
        }
        
        const dbSwitches: DBSettingsSwitch[] = settings.switches.map((currSwitch) => ({
            id                 : currSwitch.id,
            isEnabled          : currSwitch.isEnabled,
            isMutualExclusive  : currSwitch.isMutualExclusive,
            selectedOptionIndex: currSwitch.selectedOptionIndex,
            option1_label      : currSwitch.option1_label,
            option1            : currSwitch.option1,
            option2_label      : currSwitch.option2_label,
            option2            : currSwitch.option2,
            option3_label      : currSwitch.option3_label,
            option3            : currSwitch.option3,
            option4_label      : currSwitch.option4_label,
            option4            : currSwitch.option4,
            option5_label      : currSwitch.option5_label,
            option5            : currSwitch.option5,
        }));
        
        const dbSettings: DBSettings = {
            switches               : dbSwitches,
            global_instructions    : settings.global_instructions,
            categoryName           : settings.categoryName,
            registerAsAdminPassword: settings.registerAsAdminPassword
        };
        
        return dbSettings;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error retrieving settings ${error.message}`);
        }
        throw new Error("Unknown error retrieving settings.");
    }
}

/**
 * Fetches a persona by its personaId from the database and maps it to
 * a {@link DBPersona} domain model.
 * 
 * @param personaId - The persona ID to look up
 * 
 * @returns the mapped persona or {@code null} if not found
 * 
 * @throws an error when the database query fails
 */
export async function getPersona(personaId: string):
             Promise<DBPersona | null> {
    try {
        const persona = await prisma.persona.findUnique({
            where: { personaId: personaId },
            select: {
                personaId     : true,
                name          : true,
                gender        : true,
                description   : true,
                initialMessage: true,
                instructions  : true,
                skills        : true,
                categoryName  : true
            }
        });
        
        if (!persona) {
            // Found no persona with the given ID
            return null;
        }
        
        return mapPersonaToDB(persona);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error getting persona by id (${personaId}): ${error.message}`);
        }
        throw new Error(`Error getting persona by id (${personaId})`);
    }
}

/**
 * Retrieves all personas from the database and maps them to {@link DBPersona}
 * domain model.
 * 
 * @returns an array of mapped personas
 * 
 * @throws an error when the database query fails
 */
export async function getPersonas(): Promise<DBPersona[]> {
    try {
        const personas = await prisma.persona.findMany({
            select: {
                personaId     : true,
                name          : true,
                gender        : true,
                description   : true,
                initialMessage: true,
                instructions  : true,
                skills        : true,
                categoryName  : true
            }
        });
        
        return personas.map(mapPersonaToDB);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error getting personas from database: ${error.message}`);
        }
        throw new Error("Error getting personas from database" );
    }
}

/**
 * Loads a problem (with its personas and transcripts -> learningSequences
 * -> messages) from the database and maps it to the {@link DBProblem} domain
 * model.
 * 
 * @param problemId - The problem ID to look up
 * 
 * @returns te mapped problem or {@code null} if not found
 * 
 * @throws an error when the database query or mapping fail
 */
export async function getProblem(problemId: string):
             Promise<DBProblem | null> {
    try {
        const problem = await prisma.problem.findUnique({
            where: { problemId: problemId },
            include: {
                personas         : true,
                transcripts      : {
                    include: {
                        learningSequences: {
                            include: {
                                messages: {
                                    include: { persona: true },
                                    orderBy: { creationTime: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (!problem) {
            // Found no problem with the given ID
            return null;
        }
        
        return mapProblemToDB(problem);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error getting problem by id (${problemId}): ${error.message})`);
        }
        throw new Error(`Error getting problem by id (${problemId})` );
    }
}

/**
 * Retrieves all category names from the Category table.
 *
 * @returns an array of category strings, sorted alphabetically
 */
export async function getProblemCategories(): Promise<string[]> {
    try {
        const results = await prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
        return results.map(r => r.name);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching problem categories: ${error.message}`);
        }
        throw new Error("Unknown error fetching problem categories");
    }
}

/**
 * Fetches a user by email and optionally loads their chats, mapping the result
 * to the {@link DBUser} domain model.
 * 
 * @param email           - The email address of the user to fetch
 * @param includeChats    - {@code true} to include the chats owned by the user or
 *                          {@code false} to get back the user but not the chats
 * @param mostRecentFirst - {@code true} to return the chats and the messages in
 *                           most recent first order or {@code false} to return
 *                           them in least recent first order
 * 
 * @returns the mapped {@link DBUser} or {@code null} if not found
 * 
 * @throws an error when the database lookup or mapping fails
 */
export async function getUser(email          : string,
                              includeChats   : boolean,
                              mostRecentFirst = false):
             Promise<DBUser | null> {
    const order: 'asc' | 'desc' = mostRecentFirst ? 'desc' : 'asc';
    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
            include: includeChats? {
                chats: {
                    include: {
                        learningSequences: {
                            include: {
                                transcript: {
                                    include: {
                                        problem   : {
                                            include: { personas: true }
                                        }
                                    }
                                },
                                messages: {
                                    include: { persona: true },
                                    orderBy: { creationTime: order }
                                }
                            },
                        },
                        messages: {
                            where: {
                                agentId: { not: null } // Only messages with agentId
                            },
                            include: { persona: true },
                            orderBy: { creationTime: order }
                        }
                    }
                }
            } : undefined
        }) as UserWithChats<typeof order>;
        
        if (!user) {
            // Found no user with the given email
            return null;
        }
        
        const chats: DBChat[] = includeChats? await mapChatsToDBChats(user.chats) : [];
        
        //const chats = includeChats ? await mapChatsToDBChats() : [];
        const dbUser: DBUser = {
            email                    : user.email,
            name                     : user.name,
            isVerified               : user.isVerified,
            isAdmin                  : user.isAdmin,
            forgotPasswordToken      : user.forgotPasswordToken ?? undefined,
            forgotPasswordTokenExpiry: user.forgotPasswordTokenExpiry ?? undefined,
            verifyToken              : user.verifyToken ?? undefined,
            verifyTokenExpiry        : user.verifyTokenExpiry ?? undefined,
            chats                    : chats
        };
        
        return dbUser;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error getting user by email (${email}): ${error.message}`);
        }
        throw new Error(`Error getting user by email (${email})`);
    }
}

/**
 * Retrieves all non-completed chats that belong to a specific user.
 * 
 * @param email           - The email of the user whose chats should be retrieved
 * @param mostRecentFirst - {@code true} to return the chats and the messages in
 *                          most recent first order or {@code false} to return
 *                          them in least recent first order
 * 
 * @returns the chats owned by the user, or an empty array if the user has no
 *          non-completed chats 
 * 
 * @throws an error when the database lookup or mapping fails
 */
/**
 * Returns {@code true} if the user has any chat in the DB (including
 * completed ones). Used to distinguish a first-time user (for whom we
 * auto-create an initial chat) from a returning user who has finished
 * all prior chats (for whom we should render a "done" state instead).
 */
export async function userHasAnyChat(email: string): Promise<boolean> {
    const count = await prisma.chat.count({
        where: { user: { email } },
    });
    return count > 0;
}

export async function getChats(email          : string,
                               mostRecentFirst = false):
              Promise<DBChat[]> {
    const order: 'asc' | 'desc' = mostRecentFirst ? 'desc' : 'asc';
    try {
        // Query chats directly filtered by the owning user's email.
        const chats = await prisma.chat.findMany({
            where: {
                user     : { email: email }, // relational filter
                completed: false
            },
            orderBy: { creationTime: order },
            include: {
                learningSequences: {
                    include: {
                        transcript: {
                            include: {
                                problem: {
                                    include: { personas: true }
                                }
                            }
                        },
                        messages: {
                            include: { persona: true },
                            orderBy: { creationTime: order }
                        },
                    }
                },
                messages: {
                    where: {
                        agentId: { not: null } // Only messages with agentId
                    },
                    include: { persona: true },
                    orderBy: {  creationTime: order }
                }
            }
        });
        
        const dbChats = await mapChatsToDBChats(chats);
        return dbChats;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error getting chats for ${email}: ${error.message}`);
        }
        throw new Error(`Unknown error getting chats for ${email}`);
    }
}

/**
 * Returns the lowest-ID ChatTemplate that has no chats or only chats from other users.
 * 
 * The function first looks up the current user's `id`. It then asks the database
 * for the first chat template (ordered by id ASC) that either:
 *  - has no chats, OR
 *  - has chats but every chat's userId is NOT the current user's id.
 * Using a DB-side filter avoids fetching all templates and performing client-side
 * filtering.
 * 
 * @param userEmail - The email of the current user
 * 
 * @returns the selected DBChatTemplate or {@code null} if none match
 * 
 * @throws an error on unexpected database errors
 */
export async function getChatTemplate(userEmail: string,
                                      category?: string): Promise<DBChatTemplate | null> {
    try {
        // Get the user and their ID
        const user = await prisma.user.findUnique({
            where : { email: userEmail },
            select: { id: true },
        });

        if (!user) {
            return null // No user found with the given email
        }

        // Find the earliest template (lowest id) for which the user does not
        // already have an in-progress chat. A template whose prior user-chats
        // are all completed is eligible for reuse so the user can start fresh.
        // Optionally filter by category if provided.
        const template = await prisma.chatTemplate.findFirst({
            where: {
                ...(category ? { categoryName: category } : {}),
                chats: {
                    none: {
                        userId   : user.id,
                        completed: false,
                    },
                },
            },
            orderBy: { id: 'asc' },
            include: {
                problems: {
                    select: {
                        problemId: true,
                        order    : true,
                    },
                    orderBy: { order: 'asc' },
                },
                chats: {
                    select: { userId: true },
                },
            },
        });

        if (!template) {
            return null;
        }

        return {
            id        : template.id,
            name      : template.name,
            category  : template.categoryName ?? null,
            problemIds: template.problems.map((problem: { problemId: string }) => problem.problemId),
        };
    }
    catch (error) {
        if (error instanceof Error) {
           throw new Error(`Error getting chat template: ${error.message}`);
        }
        throw new Error("Unknown error getting chat template");
    }
}

// -------------------------------------------------------- //
//      C  R  E  A  T  E     F  U  N  C  T  I  O  N  S      //
// -------------------------------------------------------- //
/**
 * Creates a new user.
 * 
 * @param email    - The user email
 * @param name     - The user display name
 * @param password - The user password to encrypt and store
 * @param isAdmin  - {@code true} if the user has administrative privileges or
 *                   {@code false} otherwise (optional)
 * 
 * @returns [createdUser, null] on success; [null, errorMessage] on failure
 * 
 * @throws an error (i.e., user email) already exist or on unexpected database
 *         errors
 */
export async function createUser(email   : string,
                                 name    : string,
                                 password: string,
                                 isAdmin : boolean):
             Promise<[DBUser | null, string | null]> {
    try {
        // Hash password before attempting to create the user to avoid doing
        // work in the DB transaction.
        const hashedPassword = await bcrypt.hash(password, 10); // salt rounds = 10
        
        const user = await prisma.user.create({
            data: {
                email                    : email,
                name                     : name,
                isAdmin                  : isAdmin,
                isVerified               : false,
                forgotPasswordToken      : null,
                forgotPasswordTokenExpiry: null,
                verifyToken              : null,
                verifyTokenExpiry        : null,
                password                 : hashedPassword
            }
        });
        
        const dbUser: DBUser = {
            email                    : user.email,
            name                     : user.name,
            isAdmin                  : user.isAdmin,
            isVerified               : false,
            forgotPasswordToken      : undefined,
            forgotPasswordTokenExpiry: undefined,
            verifyToken              : undefined,
            verifyTokenExpiry        : undefined,
            chats                    : [] // The user does not own any chats yet
        };
        return [dbUser, null];
    }
    catch (error) {
        // Handle Prisma unique constraint error (duplicate email) without an
        // extra DB lookup
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return [null, `User '${email}' already exists`];
        }

        if (error instanceof Error) {
            return [null, `Error creating user with email: ${email}: ${error.message}`];
        }

        return [null, "An unknown error occurred"];
    }
}

/**
 * Creates a new chat.
 * Each transcript in the chat uses the initial message of the first persona in
 * the transcript.
 * 
 * @param email    - The email of the user who will own the chat
 * @param template - The chat template describing problems (and their order)
 * 
 * @returns [createdChat, null] on success; [null, errorMessage] on failure
 * 
 * @throws an error if there is no user with the given email or on unexpected
 *         database errors
 */
export async function createChat(email   : string,
                                 template: DBChatTemplate):
             Promise<[DBChat | null, string | null]> {
    try {
        // Validate template parameter early
        if (!template || !template.problemIds || template.problemIds.length === 0) {
            return [null, "Invalid or empty template"];
        }
        
        // 1) Minimal transaction: create chat + learning sequence rows only
        const { createdChat, learningSequencesMeta } = await
                                                       prisma.$transaction(async (txPrisma) => {
            // Ensure the user exists and get their id
            const user = await txPrisma.user.findUnique({
                where : { email: email },
                select: { id: true }
            });
            
            if (!user) {
                throw new Error(`Unknown user email: ${email}`);
            }
            
            // Create a new chat — inherit the template's category so we can
            // identify chats by category without traversing learning sequences.
            const now = new Date();
            const createdChat = await txPrisma.chat.create({
                data: {
                    userId      : user.id,
                    templateId  : template.id,
                    categoryName: template.category ?? null,
                    creationTime: now,
                    updateTime  : now
                }
            });
            
            const learningSequencesMeta: {
                chatId      : number
                transcriptId: number
            }[] = [];
            
            // For each problem in the template ensure problem exists and
            // create LearningSequence rows for each transcript
            for (const problemId of template.problemIds) {
                const problem = await txPrisma.problem.findUnique({
                    where  : { problemId: problemId },
                    select: {
                        problemId  : true,
                        personas   : {
                            select: { personaId: true }
                        },
                        transcripts: {
                            select: { id: true }
                        } 
                    }
                });
                
                if (!problem) {
                    throw new Error(`Unknown problem ID: ${problemId}`);
                }
                
                if (!problem.personas || problem.personas.length === 0) {
                    throw new Error(`Problem ${problemId} has no personas`);
                }
                
                // For each transcript, create a LearningSequence
                for (const transcript of problem.transcripts) {
                    await txPrisma.learningSequence.create({
                        data: {
                            chatId      : createdChat.id,
                            transcriptId: transcript.id
                        }
                    });
                    learningSequencesMeta.push({
                        chatId      : createdChat.id,
                        transcriptId: transcript.id,
                    });
                }
            }
            
            return {createdChat, learningSequencesMeta};
        });
        
        // 2) Outside transaction: gather persona data & prepare message rows
        const transcriptIds = Array.from(new Set(
            learningSequencesMeta.map(learningSequence => learningSequence.transcriptId))
        );
        
        const transcriptsWithProblemAndPersonas = await prisma.transcript.findMany({
            where: { id: { in: transcriptIds } },
            include: {
                problem: {
                    include: { personas: true }
                }
            }
        });
        
        // Build a map from transcriptId -> transcript (with problem & personas)
        const transcriptMap = new Map<number, typeof transcriptsWithProblemAndPersonas[0]>();
        for (const transcript of transcriptsWithProblemAndPersonas) {
            transcriptMap.set(transcript.id, transcript);
        }
        
        // Now when building messages, look up personas via the transcriptMap
        type MessageInsert = {
            personaId   : string
            chatId      : number
            problemId   : string | null
            transcriptId: number | null
            agentId     : string | null
            text        : string
            role        : string
            creationTime: Date
            updateTime  : Date
        };

        const now = new Date();
        const messagesToInsert: MessageInsert[] = [];
        const meetAgentMessagesToCreate: MessageInsert[] = [];
        const seenAgentIds = new Set<string>();

        for (const learningSequence of learningSequencesMeta) {
            const transcript = transcriptMap.get(learningSequence.transcriptId);
            if (!transcript) {
                throw new Error(`Missing transcript data for id ${learningSequence.transcriptId}`);
            }
            
            const personas = transcript.problem.personas || [];
            if (personas.length === 0) {
                throw new Error(`Missing personas for problem with id
                                 ${transcript.problem.problemId}`);
            }
            
            // Initial message from the first persona
            const firstPersona = personas[0];
            const initialMessage = {
                personaId   : firstPersona.personaId,
                chatId      : learningSequence.chatId,
                problemId   : transcript.problem.problemId,
                transcriptId: learningSequence.transcriptId,
                agentId     : null,
                text        : firstPersona.initialMessage,
                role        : Role.ASSISTANT,
                creationTime: now,
                updateTime  : now
            };
            messagesToInsert.push(initialMessage);

            // For meet-agent description messages: create them individually later
            for (const persona of personas) {
                const agentId = persona.personaId;
                if (!seenAgentIds.has(agentId)) {
                    const descriptionMessage = {
                        personaId   : agentId,
                        chatId      : learningSequence.chatId,
                        problemId   : null,
                        transcriptId: null,
                        agentId     : agentId,
                        text        : persona.description,
                        role        : Role.ASSISTANT,
                        creationTime: now,
                        updateTime  : now
                    };
                    meetAgentMessagesToCreate.push(descriptionMessage);
                    seenAgentIds.add(agentId);
                }
            }
        }
        
        // Lookup to populate as we create meet-agent messages
        const meetAgentChats: Record<string, DBMessage[]> = {};

        // 3a) Bulk-insert the initial learning-sequence messages (fast)
        if (messagesToInsert.length > 0) {
            await prisma.message.createMany({
                data: messagesToInsert
            });
        }
        
        // 3b) Individually create meet-agent messages so we get the created rows back
        for (const message of meetAgentMessagesToCreate) {
            const agentId = message.agentId!
            const createdMessage = await prisma.message.create({
                data: {
                    personaId   : agentId,
                    chatId      : message.chatId,
                    problemId   : undefined,
                    transcriptId: undefined,
                    agentId     : agentId,
                    text        : message.text,
                    role        : message.role,
                    creationTime: message.creationTime,
                    updateTime  : message.updateTime
                },
                include: { persona: true }
            });

            // mapMessageToDB accepts MessageWithPersonaIncluded
            const dbMessage = mapMessageToDB(createdMessage as Prisma.MessageGetPayload<{
                include: { persona: true }
            }>);
            // At this point each agentId should appear once in the meetAgentMessagesToCreate
            // (due to the `seenAgentIds` logic above)
            // So, we can directly assign:
            meetAgentChats[agentId] = [dbMessage];
        }

        // 4) Fetch full learning sequences with transcript & messages
        const rawSequences = await prisma.learningSequence.findMany({
            where: { chatId: createdChat.id },
            include: {
                transcript: {
                    include: {
                        problem: {
                            include: { personas: true }
                        }
                    }
                },
                messages: {
                    include: { persona: true },
                    orderBy: { creationTime: 'asc' }
                }
            }
        }) as LearningSequenceWithTranscriptAndMessages[];
        
        // 5) Map to DBLearningSequence type
        const dbLearningSequences: DBLearningSequence[] = rawSequences.map(
            sequence => mapLearningSequenceToDB(sequence)
        );
        
        // Assemble DBChat
        const dbChat: DBChat = {
            id               : createdChat.id,
            templateId       : createdChat.templateId,
            completed        : createdChat.completed,
            categoryName     : createdChat.categoryName,
            creationTime     : createdChat.creationTime,
            updateTime       : createdChat.updateTime,
            learningSequences: dbLearningSequences,
            meetAgentChats   : meetAgentChats
        };
        
        return [dbChat, null];
    }
    catch (error) {
        console.error("createChat error:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Prisma-specific logging helpful for debugging
          console.error("Prisma error code:", error.code, "meta:", error.meta);
        }
        if (error instanceof Error) {
          return [null, error.message];
        }
        return [null, "An unknown error occurred"];
    }
}

/**
 * Creates a message and updates the parent chat's updateTime in one transaction.
 * 
 * @param chatId              - The chat ID to which the message belongs
 * @param problemId           - The problem ID to which the message belongs or
 *                              {@code null} if this is a meet-with-agent message
 * @param transcriptOrAgentId - The transcript ID to which the message belongs
 *                              or the agent ID if this a meet-with-agent message
 * @param text                - The message text
 * @param role                - The role (i.e., 'user' or 'assistant' or 'system')
 * @param agentMode           - The agent mode or {@code null} if this is a user message
 * @param personaId           - The persona id where the message belongs or
 *                              {@code null} if this is a user message
 * 
 * @returns [createdMessage, null] on success; [null, errorMessage] on failure
 * 
 * @throws an error if there is no chat with the given chat ID or on unexpected
 *         database errors
 */
export async function createMessage(chatId             : number,
                                    problemId          : string | null,
                                    transcriptOrAgentId: number | string,
                                    text               : string,
                                    role               : string,
                                    agentMode          : string | null,
                                    personaId          : string | null):
             Promise<[DBMessage | null, string | null]> {
    const meetWithAgent = typeof transcriptOrAgentId === "string";
    const transcriptId: number | null = meetWithAgent? null : transcriptOrAgentId;
    const agentId     : string | null = meetWithAgent? transcriptOrAgentId : null;
    
    try {
        // Run creation and chat update in a single transaction.
        // We include the persona in the created message so mapping doesn't need
        // an extra DB lookup.
        const now = new Date();
        const message = await prisma.$transaction(async (txPrisma) => {
            // Ensure chat exists
            const chat = await txPrisma.chat.findUnique({
                where : { id: chatId },
                select: { id: true }
            });
            if (!chat) {
                throw new Error(`Unknown chat id: ${chatId}`);
            }
            
            // Create the message
            const newMessage = await txPrisma.message.create({
                data: {
                    personaId   : personaId ?? undefined,
                    problemId   : problemId,
                    chatId      : chatId,
                    transcriptId: transcriptId ?? undefined,
                    agentId     : agentId ?? undefined,
                    text        : text,
                    role        : role,
                    agentMode   : agentMode ?? undefined,
                    creationTime: now,
                    updateTime  : now
                },
                // Include persona to avoid extra lookup
                include: { persona: true }
            });
            
            await txPrisma.chat.update({
                where: { id: chatId },
                data : { updateTime: new Date() }
            });
            
            return newMessage;
        });
        
        // Map the Prisma payload (which includes persona) to DBMessage.
        const dbMessage = mapMessageToDB(message as Prisma.MessageGetPayload<{
                include: { persona: true }
        }>);
        return [dbMessage, null];
    } 
    catch (error) {
        if (error instanceof Error) {
            return [null, error.message];
        }
        
        return [null, "An unknown error occurred"];
    }
}

// -------------------------------------------------------- //
//      U  P  D  A  T  E     F  U  N  C  T  I  O  N  S      //
// -------------------------------------------------------- //
/**
 * Updates the singleton Settings record in the database.
 *
 * Assumes the Settings table contains exactly one row (id = 1).
 * Only fields present in `updatedFields` are changed; other fields remain unchanged.
 *
 * @param updatedFields - Fields to update (global_instructions
 *                                               and/or switches)
 *
 * @returns the updated settings object
 *
 * @throws an error if the settings row does not exist or on unexpected database
 *         errors
 */
export async function updateSettings(updatedFields: Partial<DBSettings>): Promise<DBSettings> {
    try {
        // Load the singleton settings row
        const existingSettings = await prisma.settings.findFirst({
            include: { switches: true },
        });
        
        if (!existingSettings) {
            throw new Error("Settings not found in the database.");
        }
        
        // Run updates in one transaction for atomicity
        await prisma.$transaction(async (tx) => {
            // Update global_instructions if provided
            if ("global_instructions" in updatedFields) {
                await tx.settings.update({
                    where: { id: existingSettings.id },
                    data : { global_instructions: updatedFields.global_instructions ?? null },
                });
            }

            // Update categoryName if provided (null = "All" mode)
            if ("categoryName" in updatedFields) {
                await tx.settings.update({
                    where: { id: existingSettings.id },
                    data : { categoryName: updatedFields.categoryName ?? null },
                });
            }

            // Update registerAsAdminPassword if provided. Callers pass the
            // plaintext; we hash it here with bcrypt (never store plaintext).
            // An empty/null value clears the password.
            if ("registerAsAdminPassword" in updatedFields) {
                const plaintext = updatedFields.registerAsAdminPassword;
                const hashed = plaintext
                    ? await bcrypt.hash(plaintext, 10)
                    : null;
                await tx.settings.update({
                    where: { id: existingSettings.id },
                    data : { registerAsAdminPassword: hashed },
                });
            }
            
            // Handle switches if provided
            if (Array.isArray(updatedFields.switches)) {
                const existingSwitchIds = new Set(existingSettings.switches.map((s) => s.id));
                const inputSwitchIds = new Set(
                    updatedFields.switches.map((s) => s.id)
                                          .filter((id): id is number => typeof id === "number")
                );
                
                // Delete switches that are no longer present
                const toDeleteIds = [...existingSwitchIds].filter(id => !inputSwitchIds.has(id));
                if (toDeleteIds.length > 0) {
                    await prisma.settingsSwitch.deleteMany({
                        where: { id: { in: toDeleteIds } },
                    });
                }
                
                // Upsert (update if exists, create otherwise) each provided switch
                for (const currSwitch of updatedFields.switches) {
                    // Prepare normalized data (DB expects null for absent option fields)
                    const switchData = {
                        settingsId         : existingSettings.id,
                        isEnabled          : currSwitch.isEnabled,
                        isMutualExclusive  : currSwitch.isMutualExclusive,
                        selectedOptionIndex: currSwitch.selectedOptionIndex ?? null,
                        option1_label      : currSwitch.option1_label ?? null,
                        option1            : currSwitch.option1 ?? null,
                        option2_label      : currSwitch.option2_label ?? null,
                        option2            : currSwitch.option2 ?? null,
                        option3_label      : currSwitch.option3_label ?? null,
                        option3            : currSwitch.option3 ?? null,
                        option4_label      : currSwitch.option4_label ?? null,
                        option4            : currSwitch.option4 ?? null,
                        option5_label      : currSwitch.option5_label ?? null,
                        option5            : currSwitch.option5 ?? null,
                    };
                    
                    if (typeof currSwitch.id === "number") {
                        // Upsert by id (update if present, otherwise create with settingsId)
                        await tx.settingsSwitch.upsert({
                            where: { id: currSwitch.id },
                            update: {
                                isEnabled          : switchData.isEnabled,
                                isMutualExclusive  : switchData.isMutualExclusive,
                                selectedOptionIndex: switchData.selectedOptionIndex,
                                option1_label      : switchData.option1_label,
                                option1            : switchData.option1,
                                option2_label      : switchData.option2_label,
                                option2            : switchData.option2,
                                option3_label      : switchData.option3_label,
                                option3            : switchData.option3,
                                option4_label      : switchData.option4_label,
                                option4            : switchData.option4,
                                option5_label      : switchData.option5_label,
                                option5            : switchData.option5,
                            },
                            create: {
                                settingsId         : existingSettings.id,
                                isEnabled          : switchData.isEnabled,
                                isMutualExclusive  : switchData.isMutualExclusive,
                                selectedOptionIndex: switchData.selectedOptionIndex,
                                option1_label      : switchData.option1_label,
                                option1            : switchData.option1,
                                option2_label      : switchData.option2_label,
                                option2            : switchData.option2,
                                option3_label      : switchData.option3_label,
                                option3            : switchData.option3,
                                option4_label      : switchData.option4_label,
                                option4            : switchData.option4,
                                option5_label      : switchData.option5_label,
                                option5            : switchData.option5,
                            }
                        });
                    }
                    else {
                        // Create new switch
                        await tx.settingsSwitch.create({
                            data: {
                                settingsId       : existingSettings.id,
                                isEnabled        : switchData.isEnabled,
                                isMutualExclusive: switchData.isMutualExclusive,
                                option1_label    : switchData.option1_label,
                                option1          : switchData.option1,
                                option2_label    : switchData.option2_label,
                                option2          : switchData.option2,
                                option3_label    : switchData.option3_label,
                                option3          : switchData.option3,
                                option4_label    : switchData.option4_label,
                                option4          : switchData.option4,
                                option5_label    : switchData.option5_label,
                                option5          : switchData.option5,
                            }
                        });
                    }
                }
            }
        });
        
        // Reload and return updated settings in DBSettings format
        const updatedSettings = await prisma.settings.findUnique({
            where  : { id: existingSettings.id },
            include: { switches: true },
        });
        
        if (!updatedSettings) {
            throw new Error("Error retrieving updated settings.");
        }
        
        const dbSettings: DBSettings = {
            global_instructions    : updatedSettings.global_instructions,
            categoryName           : updatedSettings.categoryName,
            registerAsAdminPassword: updatedSettings.registerAsAdminPassword,
            switches: updatedSettings.switches.map((currSwitch) => ({
                id                 : currSwitch.id,
                isEnabled          : currSwitch.isEnabled,
                isMutualExclusive  : currSwitch.isMutualExclusive,
                selectedOptionIndex: currSwitch.selectedOptionIndex,
                option1_label      : currSwitch.option1_label,
                option1            : currSwitch.option1,
                option2_label      : currSwitch.option2_label,
                option2            : currSwitch.option2,
                option3_label      : currSwitch.option3_label,
                option3            : currSwitch.option3,
                option4_label      : currSwitch.option4_label,
                option4            : currSwitch.option4,
                option5_label      : currSwitch.option5_label,
                option5            : currSwitch.option5,
            })),
        };
        
        return dbSettings;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to update settings: ${error.message}`);
        }
        throw new Error("Unknown error while updating settings");
    }
}

/**
 * Updates the instructions for one or more personas in a single transaction.
 *
 * @param updates - An array of objects, each containing the personaId and
 *                  the new instructions text (or null to clear instructions)
 *
 * @returns the number of personas successfully updated
 *
 * @throws an error if any personaId is not found or on unexpected database
 *         errors
 */
export async function updatePersonaInstructions(updates: {
                                                    personaId   : string;
                                                    instructions: string | null
                                                }[]): Promise<number> {
    if (!updates || updates.length === 0) {
        return 0;
    }
    
    try {
        await prisma.$transaction(async (txn) => {
            for (const update of updates) {
                await txn.persona.update({
                    where: { personaId   : update.personaId },
                    data : { instructions: update.instructions }
                });
            }
        });
        
        return updates.length;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(
                `Failed to update persona instructions: ${error.message}`
            );
        }
        throw new Error("Unknown error while updating persona instructions");
    }
}

/**
 * Updates editable fields (description, initialMessage, instructions) for one
 * or more personas in a single transaction. When the description changes,
 * also updates the meet-agent intro messages so they reflect the new text.
 *
 * @param updates - An array of objects, each containing the personaId and
 *                  the fields to update
 *
 * @returns the number of personas successfully updated
 *
 * @throws an error if any personaId is not found or on unexpected database
 *         errors
 */
export async function updatePersonaFields(updates: {
                                              personaId     : string;
                                              description?  : string;
                                              initialMessage?: string;
                                              instructions? : string | null;
                                              skills?       : string | null;
                                          }[]): Promise<number> {
    if (!updates || updates.length === 0) {
        return 0;
    }

    try {
        await prisma.$transaction(async (txn) => {
            for (const update of updates) {
                // If description changed, also update the meet-agent intro
                // messages (one per chat) so they reflect the new text.
                if (update.description !== undefined) {
                    await txn.message.updateMany({
                        where: {
                            agentId     : update.personaId,
                            transcriptId: null,
                            role        : Role.ASSISTANT
                        },
                        data: { text: update.description }
                    });
                }

                const data: Record<string, string | null> = {};
                if (update.description    !== undefined) data.description    = update.description;
                if (update.initialMessage !== undefined) data.initialMessage = update.initialMessage;
                if (update.instructions   !== undefined) data.instructions   = update.instructions;
                if (update.skills         !== undefined) data.skills         = update.skills;

                if (Object.keys(data).length > 0) {
                    await txn.persona.update({
                        where: { personaId: update.personaId },
                        data
                    });
                }
            }
        });

        return updates.length;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(
                `Failed to update persona fields: ${error.message}`
            );
        }
        throw new Error("Unknown error while updating persona fields");
    }
}

/**
 * Updates a user.
 *
 * @param currEmail                 - The current email
 * @param newName                   - The new display name (optional)
 * @param newEmail                  - The new email (optional)
 * @param newPassword               - The new password (optional)
 * @param isAdmin                   - {@code true} if the user has administrative
 *                                     privileges or {@code false} otherwise
 *                                    (optional)
 * @param isVerified                - {@code true} if the user is verified or
 *                                    {@code false} otherwise (optional)
 * @param forgotPasswordToken       - The token that is used to reset the
 *                                    password if the user forgot their password
 *                                    or {@code null} to clear the existing value
 * @param forgotPasswordTokenExpiry - The expiration date for the forgot password
 *                                    token or {@code null} to clear the current value
 * @param verifyToken               - The token to verify user or {@code null}
 *                                    to clear the value
 * @param  verifyTokenExpiry        - The expiration date for the verify user
 *                                    token or {@code null} to clear the
 *                                    existing value
 * 
 * @returns [true, null] on success; [false, errorMessage] on failure
 * 
 * @throws an error if no field to update was specified or on unexpected 
 *         database errors
 */
export async function updateUser(currEmail                 : string,
                                 newEmail?                 : string,
                                 newName?                  : string,
                                 newPassword?              : string,
                                 isAdmin?                  : boolean,
                                 isVerified?               : boolean,
                                 forgotPasswordToken?      : string | null,
                                 forgotPasswordTokenExpiry?: Date | null,
                                 verifyToken?              : string | null,
                                 verifyTokenExpiry?        : Date | null):
             Promise<[boolean, string | null]> {
    if (newName                   === undefined &&
        newEmail                  === undefined &&
        newPassword               === undefined &&
        isVerified                === undefined &&
        forgotPasswordToken       === undefined &&
        forgotPasswordTokenExpiry === undefined &&
        verifyToken               === undefined &&
        verifyTokenExpiry         === undefined ) {
        return [false, "You must provide a field to update"];
    }
    
    try{
        // Pre-hash password if provided (keeps the update object simple).
        const hashedPassword = typeof newPassword === "string"?
                               await bcrypt.hash(newPassword, 10) : undefined;
                               
        await prisma.user.update({
            where: { email: currEmail },
            data : {
                name                     : newName,
                email                    : newEmail,
                password                 : hashedPassword,
                isAdmin                  : isAdmin,
                isVerified               : isVerified,
                forgotPasswordToken      : forgotPasswordToken,
                forgotPasswordTokenExpiry: forgotPasswordTokenExpiry,
                verifyToken              : verifyToken,
                verifyTokenExpiry        : verifyTokenExpiry
            },
        });
        
        return [true, null];
    }
    catch (error) {
        // Handle unique-constraint (e.g., email already in use) explicitly
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const meta = error.meta as Record<string, unknown> | undefined;
            const target = Array.isArray(meta?.target) ? meta.target : undefined;
            
            if (target && target.length > 0) {
                return [false, `Unique constraint failed on the fields: ${target.join(", ")}`];
            }
            return [false, "Unique constraint failed (possibly email already in use)"];
        }
        
        // If update failed because the current user does not exist, report that clearly
        try {
            const user = await prisma.user.findUnique({
                where: { email: currEmail },
            });
            
            if (!user) {
                return [false, "Found no user with the given email: " + currEmail];
            }
        }
        catch {
            // ignore lookup errors — we'll fall through to the generic handler below
        }
        
        if (error instanceof Error) {
            return [false, `Error updating user with email ${currEmail}: ${error.message}`];
        }
        
        return [false, "An unknown error occurred"]; 
    }
}

/**
 * Verifies a user given a verification token.
 *
 * Steps:
 *  1. Validates the token (must be a verification token and not expired).
 *  2. If valid, marks the user as verified and clears all verification/reset tokens.
 * 
 * @param token - Verification token to validate
 * 
 * @returns [true, null] on success; [false, errorMessage] on failure
 * 
 * @throws an error if the verification fails or on unexpected database errors
 */
export async function verifyUser(token: string):
             Promise<[boolean, string | null]> {
    try {
        const userEmail = await searchForValidToken(token, true);
        
        if (!userEmail) {
            return [false, 'Invalid or expired token'];
        }

        const [updated, err] = await updateUser(userEmail, // currEmail
                                                undefined, // newEmail
                                                undefined, // newName
                                                undefined, // newPassword
                                                undefined, // isAdmin
                                                true,      // isVerified
                                                null,      // forgotPasswordToken
                                                null,      // forgotPasswordTokenExpiry
                                                null,      // verifyToken
                                                null);     // verifyTokenExpiry
            
        if (!updated) {
            return [false, err ?? "Failed to verify user"];
        }
        
        return [true, null];
    }
    catch (error) {
        if (error instanceof Error) {
            return [false, `Error verifying user: ${error.message}`];
        }
        return [false, 'Unknown error occurred'];
    }
}

/**
 * Reset a user's password using a valid forgot-password token.
 *
 * Steps:
 *  1. Validate the token (must be a forgot-password token and not expired).
 *  2. If valid, set the user's password to the provided newPassword and clear any
 *     password/verification tokens on the account.
 * 
 * @param token       - The forgot-password to validate
 * @param newPassword - The new password
 * 
 * @returns {[boolean, string | null]} Tuple: [true, null] on success;
 *                                            [false, errorMessage] on failure
 * 
 * @throws an error on unexpected database errors
 */
export async function resetPassword(token      : string,
                                    newPassword: string):
       Promise<[boolean, string | null]> {
    try {
        const userEmail = await searchForValidToken(token, false);
        if (!userEmail) {
            return [false, 'Invalid or expired token'];
        }
        
        const [updated, err] =  await updateUser(userEmail,   // currEmail
                                                 undefined,   // newEmail
                                                 undefined,   // newName
                                                 newPassword, // newPassword
                                                 undefined,   // isAdmin
                                                 undefined,   // isVerified
                                                 null,        // forgotPasswordToken
                                                 null,        // forgotPasswordTokenExpiry
                                                 null,        // verifyToken
                                                 null);       // verifyTokenExpiry
        if (!updated) {
            return [false, err ?? "Failed to reset password"];
        }
        
        return [true, null];
    }
    catch (error) {
        if (error instanceof Error) {
            return [false, `Error resetting password: ${error.message}`];
        }
        return [false, 'Unknown error occurred'];
    }
}

/**
 * Updates a chat's {@code completed} flag and returns the updated chat
 * (including learningSequences and meetAgentChats).
 * 
 * Notes:
 * - The returned {@link DBChat} includes:
 *   - learningSequences with transcript -> problem -> personas and messages
 *     (each message includes its persona)
 *   - meetAgentChats with agent persona and messages (each message includes
 *     its persona)
 * - If the chat is missing its {@code templateId}, this function treats it as
 *   an error and returns a failure tuple
 * 
 * @param chatId          - The ID of the chat to update
 * @param completed       - New completed value for the chat
 * @param mostRecentFirst - {@code true} to return the chats and the messages in
 *                           most recent first order or {@code false} to return
 *                           them in least recent first order
 * 
 * @returns [updatedChat, null] on success; [null, errorMessage] on failure
 * 
 * @throws an error on unexpected database errors
 */
export async function updateChat(chatId         : number,
                                 completed      : boolean,
                                 mostRecentFirst = false) :
       Promise<[DBChat | null, string | null]> {
    const order: 'asc' | 'desc' = mostRecentFirst ? 'desc' : 'asc';
    try{
        const chat = await prisma.chat.update({
            where: { id: chatId },
            data : { completed: completed },
            include: {
                learningSequences: {
                    include: {
                        transcript: {
                            include: {
                                problem: {
                                    include: { personas: true }
                                }
                            }
                        },
                        messages: {
                            include: { persona: true },
                            orderBy: { creationTime: order }
                        }
                    }
                },
                messages: {
                    where: {
                        agentId: { not: null } // Only messages with agentId
                    },
                    include: { persona: true },
                    orderBy: { creationTime: order }
                }
            }
        });
        
        const [dbChat] = await mapChatsToDBChats([chat]);
        return [dbChat, null];
    }
    catch (error) {
        if (error instanceof Error) {
            return [null, `Error updating chat ${chatId}: ${error.message}`];
        }
        else {
            return [null, `Unknown error updating chat ${chatId}`];
        }
    }
}

/**
 * Updates the text content of the specified message.
 *
 * Ensures the message belongs to the provided {@code chatId}, performs the
 * update in a transaction (together with touching the parent chat's
 * {@code updateTime}), and returns the mapped {@link DBMessage}.
 * 
 * @param chatId    - The ID of the chat which includes the message to update
 * @param messageId - The ID of the message to update
 * @param text      - The new message text
 * @param agentMode - The agent mode or {@code null} if this is a user message
 * 
 * @returns updatedMessage, null] on success; [null, errorMessage] on failure.
 * 
 * @throws an error if the message with the given ID is not found, if the
 *         message does not belong to the specified chat or on unexpected
 *         database errors
 */
export async function updateMessage(chatId   : number,
                                    messageId: number,
                                    text     : string,
                                    agentMode: string | null):
       Promise<[DBMessage | null, string | null]> {
    try {
        const updateTime = new Date();
        
        // Run verification + update in a single transaction for safety
        const updatedMessage = await prisma.$transaction(async (txPrisma) => {
             // 1) Ensure the message exists and belongs to the provided chatId
            const existingMessage = await txPrisma.message.findUnique({
                where: { id: messageId },
                select: {
                    id     : true,
                    chatId : true
                }
            });
            
            if (!existingMessage) {
                throw new Error(`Found no message with the given id: ${messageId}`);
            }
            
            if (existingMessage.chatId !== chatId) {
                throw new Error(`Message id=${messageId} does not belong to chat id=${chatId}`);
            }
            
            // 2) Update the message and include persona to avoid extra DB lookups later
            const updatedMsg = await txPrisma.message.update({
                where: { id: messageId },
                data: {
                    text      : text,
                    agentMode : agentMode ?? undefined,
                    updateTime: updateTime
                },
                include: { persona: true },
            });
            
            // 3) Touch the parent chat's updateTime
            await txPrisma.chat.update({
                where: { id: chatId },
                data : { updateTime },
             });
             
            return updatedMsg;
        });
        
         // Map the Prisma payload (includes persona) to DBMessage
        const dbMessage = mapMessageToDB(
            updatedMessage as Prisma.MessageGetPayload<{ include: { persona: true } }>
        );
        
        return [dbMessage, null];
    }
    catch (error) {
        // Log with proper interpolation
        if (error instanceof Error) {
            console.log(`Error updating message id=${messageId} in chat id=${chatId}: ${
                        error.message}`);
            return [null, error.message];
        }
        else {
            console.log(`Unknown error updating message id=${messageId} in chat id=${chatId}`);
            return [null, "An unknown error occurred"];
        }
    }
}

// -------------------------------------------------------- //
//      D  E  L  E  T  E     F  U  N  C  T  I  O  N  S      //
// -------------------------------------------------------- //
/**
 * Deletes a user (and cascades to related chats/messages via DB referential
 * actions).
 * 
 * @param email - The user email address
 * 
 * @returns [true, null] on success; [false, errorMessage] on failure
 * 
 * @throws an error if the user with the given email is not found or on
 *         unexpected database errors
 */
export async function deleteUser(email: string):
             Promise<[boolean, string | null]> {
    try {
        await prisma.user.delete({
            where: { email: email },
        });
        
        return [true, null]
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return [false, `Found no user with the given email: ${email}`];
        }
        
        if (error instanceof Error) {
            return [false, `Error deleting user ${email}: ${error.message}`];
        }
        
        return [false, "An unknown error occurred"];
    }
}

/**
 * Deletes a chat (and cascades to related learning sequences/messages via DB
 * referential actions).
 *
 * @param chatId - The chat IS
 * 
 * @returns [true, null] on success; [false, errorMessage] on failure
 * 
 * @throws an error if the chat with the given ID is not found or on unexpected
 *         database errors
 */
export async function deleteChat(chatId: number):
             Promise<[boolean, string | null]> {
    try {
        await prisma.chat.delete({
            where: { id: chatId }
        });
        
        return [true, null];
    }
    catch (error) {
        // Prisma throws P2025 when the record to delete doesn't exist
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return [false, `Found no chat with the given id: ${chatId}`];
        }
        
        if (error instanceof Error) {
            return [false, `Error deleting chat ${chatId}: ${error.message}`];
        }
        
        return [false, "An unknown error occurred"];
    }
}

/**
 * Deletes a message and touches the parent chat's updateTime.
 * 
 * @param messageId - The message ID
 * 
 * @returns [true, null] on success; [false, errorMessage] on failure
 * 
 * @throws an error if the message with the given ID is not found or on
 *         unexpected database errors
 */
export async function deleteMessage(messageId: number):
             Promise<[boolean, string | null]> {
    try {
        // Delete the message and return the deleted row so we can update the parent chat's updateTime.
        await prisma.$transaction(async (tx) => {
            const deleted = await tx.message.delete({
                where : { id: messageId },
                select: { chatId: true }, // fetch chatId so we can update the chat
            });
            
            // Update the parent chat's updateTime to reflect the deletion
            await tx.chat.update({
                where: { id: deleted.chatId },
                data : { updateTime: new Date() },
            });
        });
                
        return [true, null];
    }
    catch (error) {
        // Record not found
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return [false, `Found no message with the given id: ${messageId}`];
        }
        
        if (error instanceof Error) {
            return [false, `Error deleting message ${messageId}: ${error.message}`];
        }
                
        return [false, "An unknown error occurred"];
    }
}

// -------------------------------------------------------- //
//      H  E  L  P  E  R     F  U  N  C  T  I  O  N  S      //
// -------------------------------------------------------- //
/**
 * Authenticates a user by email and password.
 * 
 * @param email    - The user email
 * @param password - The user password
 * 
 * @returns the authenticated DBUser (including their chats) or {@code null} if
 *          the credentials are invalid
 * 
 * @throws {Error} if a database or unexpected error occurs during authentication
 */
export async function authenticateUser(email   : string,
                                       password: string):
             Promise<DBUser | null> {
    try {
        // Fetch user and include chats + nested data (messages include persona to avoid N+1).
        const user = await prisma.user.findUnique({
            where : { email: email }
        });
        
        // If no such user, credentials are invalid
        if (!user) {
            return null;
        }
        
        // Compare hashed password
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return null;
        }
        
        // Map to DBUser — reuse existing helper to convert chats
        const dbUser: DBUser = {
            email                    : user.email,
            name                     : user.name,
            isAdmin                  : user.isAdmin,
            isVerified               : user.isVerified,
            forgotPasswordToken      : user.forgotPasswordToken ?? undefined,
            forgotPasswordTokenExpiry: user.forgotPasswordTokenExpiry ?? undefined,
            verifyToken              : user.verifyToken ?? undefined,
            verifyTokenExpiry        : user.verifyTokenExpiry ?? undefined,
            chats                    : []
        };
        
        return dbUser
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error authenticating user '${email}': ${error.message}`);
        }
        throw new Error(`Error authenticating user '${email}'`);
    }
}

/**
 * Searches the database for a user associated with the specified token and
 * verifies that the token has not expired.
 * 
 * If the token is valid (exists and has not expired), the user's email is returned.
 * Otherwise, {@code null} is returned.
 * 
 * @param token      - The token to search for
 * @param verifyUser - {@code true} if this is a verification token or
 *                     {@code false} if this is a forgot password token
 * 
 * @return the email of the user with the valid token,or {@code null} if no
 *         valid token is found
 * 
 * @throws an error on unexpected database errors
 */
async function searchForValidToken(token     : string,
                                   verifyUser: boolean): Promise<string | null> {
    try {
        let user;
        
        if (verifyUser) { // Verify user
            user = await prisma.user.findFirst({
                where: {
                    verifyToken: token,
                    verifyTokenExpiry: {
                        gte: new Date()
                    }
                 }
            })
        }
        else { // Forgot password
            user = await prisma.user.findFirst({
                where: {
                    forgotPasswordToken: token,
                    forgotPasswordTokenExpiry: {
                        gte: new Date() 
                    }
                }
            });
        }
        
        if (!user) {
            return null;
        }
        return user.email;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error searching for token=${token}: ${error.message}`);
        }
        throw new Error(`Error searching for token=${token}`);
    }
}

// ====================================================================== //
//                     W H I T E B O A R D                                //
// ====================================================================== //
/**
 * Retrieves the whiteboard data for a specific learning sequence.
 *
 * @param chatId       - The chat ID
 * @param transcriptId - The transcript ID
 *
 * @returns the whiteboard data or {@code null} if none exists
 */
export async function getWhiteboardData(chatId: number,
                                        transcriptId: number): Promise<WhiteboardData | null> {
    const sequence = await prisma.learningSequence.findUnique({
        where : { chatId_transcriptId: { chatId, transcriptId } },
        select: { whiteboardData: true }
    });
    return (sequence?.whiteboardData as WhiteboardData) ?? null;
}

/**
 * Saves whiteboard data for a specific learning sequence.
 *
 * @param chatId       - The chat ID
 * @param transcriptId - The transcript ID
 * @param data         - The Excalidraw whiteboard data to persist
 */
export async function saveWhiteboardData(chatId: number,
                                         transcriptId: number,
                                         data: WhiteboardData): Promise<void> {
    await prisma.learningSequence.update({
        where: { chatId_transcriptId: { chatId, transcriptId } },
        data : { whiteboardData: data as unknown as Prisma.JsonObject }
    });
}

// ----------------------------------------------- //
//      M  A  P     F  U  N  C  T  I  O  N  S      //
// ----------------------------------------------- //
/**
 * Maps a Prisma.Persona object (with a limited field selection)
 * to a {@link DBPersona} domain model.
 *
 * @param persona - The Prisma Persona object containing only the selected fields.
 *
 * @returns {DBPersona} a {@link DBPersona} object representing the same persona.
 */
function mapPersonaToDB(persona: SelectedFieldsFromPersona): DBPersona {
    return {
        personaId     : persona.personaId,
        name          : persona.name,
        gender        : persona.gender as Gender,
        description   : persona.description,
        initialMessage: persona.initialMessage,
        instructions  : persona.instructions ?? null,
        skills        : persona.skills ?? null,
        category      : persona.categoryName
    };
};

/**
 * Maps an array of Prisma chat records into {@link DBChat[]} objects.
 * The generic Order keeps the message ordering type-safe ('asc' | 'desc').
 * 
 * @param chats            - Array of Prisma.Chat objects (including nested data).
 *
 * @returns the mapped {@link DBChat[]} array object representing the mapped chats
 *
 * @throws an error if any chat is missing {@code templateId} or on unexpected database
 *         errors
 */
async function mapChatsToDBChats<Order extends 'asc' | 'desc'>(chats: ChatWithLearningSequences<Order>[] | undefined):
               Promise<DBChat[]> {
    if (!chats || chats.length === 0) {
        return [];
    }
    
    // Assemble DBChat[] using precomputed learningSequences and lookups
    const dbChats: DBChat[] = chats.map(chat => {
        if (chat.templateId == null) { // catches null or undefined
            throw new Error(`Chat id=${chat.id} is missing templateId`);
        }
        
        // Map learningSequences
        const learningSequences: DBLearningSequence[] =
              (chat.learningSequences ?? []).map(mapLearningSequenceToDB);
        
        const meetAgentChats = buildMeetAgentChatsLookupFromIncluded(chat);
        return {
            id               : chat.id,
            templateId       : chat.templateId ?? null,
            completed        : chat.completed,
            categoryName     : chat.categoryName ?? null,
            creationTime     : chat.creationTime,
            updateTime       : chat.updateTime,
            learningSequences: learningSequences,
            meetAgentChats   : meetAgentChats
        };
    });
    
    return dbChats;
}

/**
 * Maps a Prisma.transcript object and its parent Prisma.Problem record
 * to a {@link DBTranscript} domain model.
 * The provided {@code parentProblem} excludes its {@code transcripts} field to
 * prevent circular references during serialization or object graph construction.
 * 
 * Notes:
 * - {@link DBTranscript}.problem is typed as a full {@link DBProblem} (which
 *   includes a {@code transcripts} array). To avoid circular references we embed
 *   a parent problem object whose {@code transcripts} is an empty array when
 *   constructing the returned {@link DBTranscript}.
 * - The supplied {@code parentProblem} may be either a full {@link DBProblem}
 *   (typically with {@code transcripts}: []) or an {@code Omit<DBProblem, "transcripts">}.
 *   The function will always produce a full {@link DBProblem} for the embedded
 *   {@code problem}.
 * - Any learningSequences included on the Prisma transcript are intentionally
 *   NOT mapped here — those should be mapped with {@link mapLearningSequenceToDB}
 *   by callers that need DBLearningSequence objects.
 * 
 * @param transcript    - The Prisma transcript record to convert
 * @param parentProblem - The parent problem (without transcripts OR with an
 *                        empty {@code transcripts} array).
 * 
 * @returns the mapped {@link DBTranscript} object representing the mapped transcript.
 */
function mapTranscriptToDB(transcript    : SelectedFieldsFromTranscript,
                           parentProblem: Omit<DBProblem, "transcripts">):
         DBTranscript {
    return {
        id              : transcript.id,
        problemId       : transcript.problemId,
        problem         : {
            ...parentProblem,
            transcripts:[],
        },
        text            : transcript.text ?? null,
        imageURL        : transcript.imageURL ?? null,
        imageDescription: transcript.imageDescription ?? null,
        agentNotes      : transcript.agentNotes ?? null,
    };
};

/**
 * Maps a Prisma.Problem (including its personas and transcripts) to a
 * {@link DBProblem} domain model.
 *
 * Notes:
 * - Personas are mapped once and reused for both the {@code personas} field and the
 *   {@code parentProblem} passed to each transcript mapping to avoid double work.
 * - The parent problem passed to transcript mapping always receives
 *   {@code transcripts: []} to avoid circular references.
 * 
 * @param problem - The Prisma problem payload including {@code personas and
 *                  {@code transcripts}
 * 
 * @returns τhe mapped DBProblem
 */
function mapProblemToDB(problem: Prisma.ProblemGetPayload<{
                                        include: {
                                            personas   : true,
                                            transcripts: {
                                                include: {
                                                    learningSequences: {
                                                        include: {
                                                            messages: {
                                                                include: { persona: true }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        };
                                    }>
                       ): DBProblem {
    // Map personas once and reuse the result to avoid repeated mapping work.
    const mappedPersonas = problem.personas.map(mapPersonaToDB);
    
    // Build a parentProblem object (without transcripts) to pass to transcript mapper.
    const parentProblem: Omit<DBProblem, "transcripts"> = {
        problemId       : problem.problemId,
        title           : problem.title,
        text            : problem.text ?? null,
        imageURL        : problem.imageURL ?? null,
        imageDescription: problem.imageDescription ?? null,
        agentNotes      : problem.agentNotes ?? null,
        personas        : mappedPersonas,
    };

    return {
        problemId       : problem.problemId,
        title           : problem.title,
        text            : problem.text ?? null,
        imageURL        : problem.imageURL ?? null,
        imageDescription: problem.imageDescription ?? null,
        agentNotes      : problem.agentNotes ?? null,
        personas        : mappedPersonas,
        transcripts     : problem.transcripts.map((transcript) =>
            mapTranscriptToDB(transcript as SelectedFieldsFromTranscript,
                              parentProblem)
        )
    };
};

/**
 * Maps a Prisma.Message to a {@link DBMessage} domain model.
 *
 * Behavior:
 *  - If {@code personaOverride} is provided (may be {@code null}), it is used directly.
 *  - Otherwise, if the Prisma payload includes {@code message.persona}, it is mapped via {@link mapPersonaToDB}.
 *  - Otherwise, the resulting {@code DBMessage.persona} is {@code null}.
 *
 * This avoids N+1 database lookups when callers include {@code persona} in
 * their queries or pass a pre-fetched override.
 *
 * @param message         - The Prisma.Message record (expected to include
 *                          {@code persona} when possible)
 * @param personaOverride - Optional pre-fetched or pre-mapped {@code DBPersona}
 *                          to override the one in {@code message}
 * 
 * @returns a fully mapped {@code DBMessage} object
 */
function mapMessageToDB(message         : MessageWithPersonaIncluded,
                        personaOverride?: DBPersona | null): DBMessage {
    // 1) Explicit override provided (can be null to indicate "no persona")
    if (personaOverride !== undefined) {
        return {
            id          : message.id,
            text        : message.text,
            role        : message.role,
            agentMode   : message.agentMode,
            creationTime: message.creationTime,
            updateTime  : message.updateTime,
            persona     : personaOverride
        };
    }
    
    // 2) Use the included persona directly (may be null if FK is null)
    //    Await mapPersonaToDB in case it's async.
    const dbPersona = message.persona ? mapPersonaToDB(message.persona) : null;
    
    return {
        id          : message.id,
        text        : message.text,
        role        : message.role,
        agentMode   : message.agentMode,
        creationTime: message.creationTime,
        updateTime  : message.updateTime,
        persona     : dbPersona
    };
}

/**
 * Map a Prisma.LearningSequence payload (including its transcript,
 * problem/personas, and messages with persona included) to the
 * {@link DBLearningSequence} domain model.
 * 
 * Notes:
 * - When embedding the parent problem inside the produced {@link DBTranscript}, we
 *   create a full {@link DBProblem} with {@code transcripts: []} to satisfy the type
 *   and avoid cycles.
 * 
 * @param learningSequence - The learningSequence including its nested data
 *                           payload with its nested transcript,
 *                           problem.personas, and messages.persona included
 * 
 * @returns a {@link DBLearningSequence} object
 */
function mapLearningSequenceToDB(learningSequence: LearningSequenceWithTranscriptAndMessages):
         DBLearningSequence {
    // 1) Map personas from the included problem to DBPersona
    //    (structural typing: extra fields from Prisma are allowed)
    const mappedPersonas: DBPersona[] = learningSequence.transcript.problem.personas.map(
        (persona) => mapPersonaToDB(persona)
    );
    
    // 2) Build the parent problem WITHOUT transcripts to avoid circular references.
    const parentProblemWithoutTranscripts: Omit<DBProblem, "transcripts"> = {
        problemId       : learningSequence.transcript.problem.problemId,
        title           : learningSequence.transcript.problem.title,
        text            : learningSequence.transcript.problem.text ?? null,
        imageURL        : learningSequence.transcript.problem.imageURL ?? null,
        imageDescription: learningSequence.transcript.problem.imageDescription ?? null,
        agentNotes      : learningSequence.transcript.problem.agentNotes ?? null,
        personas        : mappedPersonas
    };
    
    // 3) Build DBTranscript (attach an empty transcripts array on the embedded
    //    problem to match DBProblem)
    const dbTranscript: DBTranscript = {
        id              : learningSequence.transcript.id,
        problemId       : learningSequence.transcript.problemId,
        problem         : {
            ...parentProblemWithoutTranscripts,
            transcripts: [], // intentionally empty to avoid cycles
        },
        text            : learningSequence.transcript.text ?? null,
        imageURL        : learningSequence.transcript.imageURL ?? null,
        imageDescription: learningSequence.transcript.imageDescription ?? null,
        agentNotes      : learningSequence.transcript.agentNotes ?? null
    };
    
    // 4) Map messages. Use Promise.all in case mapMessageToDB is async.
    const mappedMessages: DBMessage[] = learningSequence.messages.map((message) =>
        mapMessageToDB(message)
    );
    
    return {
        chatId        : learningSequence.chatId,
        transcript    : dbTranscript,
        messages      : mappedMessages,
        whiteboardData: (learningSequence.whiteboardData as WhiteboardData) ?? null
    };
};

/**
 * Builds a meet-agent lookup from a Chat payload that already includes
 * {@code messages} filtered to only those with {@code agentId != null} and with
 * {@code persona} included.
 *
 * @param chat - A Prisma.Chat payload with {@code messages} included
 *               (each message expected to be `MessageWithPersonaIncluded`).
 * @returns A Record mapping agentId -> DBMessage[] (chronological order preserved).
 */
function buildMeetAgentChatsLookupFromIncluded<Order extends 'asc' | 'desc'>(chat: ChatWithLearningSequences<Order>):
         Record<string, DBMessage[]> {
    const result: Record<string, DBMessage[]> = {};
    const messages = chat.messages ?? [];
    
    // messages elements come from the Prisma include { persona: true } so they match
    // MessageWithPersonaIncluded; cast for stronger typing.
    for (const message of messages as MessageWithPersonaIncluded[]) {
        const agentId = message.agentId;
        if (!agentId) {
           // defensive: skip any unexpected null/undefined agentId
           console.log("Excepted agentId to be non-null, but found it to be null");
           continue;
        }
        
        const dbMessage = mapMessageToDB(message);
        
        if (!result[agentId]) {
            result[agentId] = [];
        }
        result[agentId].push(dbMessage);
    }
    
    return result;
}
