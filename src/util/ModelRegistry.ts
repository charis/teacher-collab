/**
 * Central model metadata for all Prisma models.
 * Used by the admin Database Management modal for generic CRUD,
 * CSV import/export, and sequence fixing.
 */

// ========================= //
//   M O D E L   N A M E S   //
// ========================= //

/** All Prisma model names in the schema, sorted alphabetically. */
export const MODEL_NAMES = [
    'Category',
    'Chat',
    'ChatTemplate',
    'ChatTemplateProblem',
    'LearningSequence',
    'Message',
    'Persona',
    'Problem',
    'Settings',
    'SettingsSwitch',
    'Transcript',
    'User'
] as const;

/** Union type of all valid Prisma model name strings. */
export type ModelName = typeof MODEL_NAMES[number];

/** FK-safe import order (matches prisma/scripts/import-all.ts) */
export const IMPORT_ORDER: ModelName[] = [
    'Category',
    'User',
    'Persona',
    'Settings',
    'SettingsSwitch',
    'Problem',
    'Transcript',
    'ChatTemplate',
    'ChatTemplateProblem',
    'Chat',
    'LearningSequence',
    'Message'
];

// ========================= //
//   F I E L D   T Y P E S   //
// ========================= //

/** Supported column types for model field definitions. */
export type FieldType = 'number' | 'string' | 'boolean' | 'date' | 'json';

/**
 * Describes a single field (column) within a Prisma model.
 *
 * Used by the Browse & Edit tab to auto-generate table columns and
 * input controls, and by the import logic to coerce CSV values.
 */
export type FieldDef = {
    /** Column name as it appears in the Prisma schema */
    name     : string;
    /** Data type used for rendering inputs and coercing values */
    type     : FieldType;
    /** {@code true} if the field accepts {@code null} in the database */
    nullable?: boolean;
    /** {@code true} for auto-generated fields (e.g., id, timestamps) that
     *  should not be editable in the UI */
    readOnly?: boolean;
};

// ========================= //
//   M O D E L   M E T A     //
// ========================= //

/**
 * Metadata for a single Prisma model. Drives the generic CRUD UI, CSV
 * import/export, and Postgres sequence fixes in the Database Management modal.
 */
export type ModelMeta = {
    /** Model name exactly as it appears in the Prisma schema */
    name          : ModelName;
    /** Human-readable label shown in the UI (e.g., {@code "Learning Sequences"}) */
    displayName   : string;
    /** Primary key field name(s). A single string for simple keys or an array
     *  for composite keys (e.g., {@code ['chatId', 'transcriptId']}). */
    primaryKey    : string | string[];
    /** Unique field used for the {@code where} clause in upsert operations
     *  (e.g., {@code 'email'} for User, {@code 'personaId'} for Persona).
     *  Falls back to {@link primaryKey} when omitted. */
    uniqueKey?    : string;
    /** Ordered list of field definitions for this model */
    fields        : FieldDef[];
    /** Relations to include when fetching records for CSV export
     *  (e.g., {@code \{ personas: true \}} for Problem) */
    prismaIncludes?: Record<string, boolean>;
    /** The actual Postgres column name that backs the auto-increment sequence.
     *  {@code null} for models without one (e.g., composite-key models). */
    sequenceColumn: string | null;
};

// ======================================= //
//   M O D E L   D E F I N I T I O N S     //
// ======================================= //
/**
 * Complete metadata for every Prisma model in the schema.
 * Keyed by {@link ModelName}, each entry describes the model's primary key,
 * fields, display name, and Postgres sequence column.
 */
export const MODEL_META: Record<ModelName, ModelMeta> = {
    Category: {
        name          : 'Category',
        displayName   : 'Categories',
        primaryKey    : 'name',
        sequenceColumn: null,
        fields: [
            { name: 'name', type: 'string' },
        ],
    },

    User: {
        name          : 'User',
        displayName   : 'Users',
        primaryKey    : 'id',
        uniqueKey     : 'email',
        sequenceColumn: '_id',
        fields: [
            { name: 'id',                        type: 'number',  readOnly: true },
            { name: 'email',                     type: 'string'                  },
            { name: 'name',                      type: 'string'                  },
            { name: 'password',                  type: 'string'                  },
            { name: 'isAdmin',                   type: 'boolean'                 },
            { name: 'isVerified',                type: 'boolean'                 },
            { name: 'forgotPasswordToken',       type: 'string',  nullable: true },
            { name: 'forgotPasswordTokenExpiry', type: 'date',    nullable: true },
            { name: 'verifyToken',               type: 'string',  nullable: true },
            { name: 'verifyTokenExpiry',         type: 'date',    nullable: true },
        ],
    },
    
    Persona: {
        name          : 'Persona',
        displayName   : 'Personas',
        primaryKey    : 'id',
        uniqueKey     : 'personaId',
        sequenceColumn: '_id',
        fields: [
            { name: 'id',             type: 'number',  readOnly: true },
            { name: 'personaId',      type: 'string'                  },
            { name: 'name',           type: 'string'                  },
            { name: 'gender',         type: 'string'                  },
            { name: 'description',    type: 'string'                  },
            { name: 'initialMessage', type: 'string'                  },
            { name: 'instructions',   type: 'string',  nullable: true },
            { name: 'skills',         type: 'string',  nullable: true },
            { name: 'categoryName',   type: 'string'                  },
        ],
    },
    
    Problem: {
        name          : 'Problem',
        displayName   : 'Problems',
        primaryKey    : 'id',
        uniqueKey     : 'problemId',
        sequenceColumn: '_id',
        prismaIncludes: { personas: true, transcripts: true },
        fields: [
            { name: 'id',               type: 'number',  readOnly: true },
            { name: 'problemId',        type: 'string'                  },
            { name: 'title',            type: 'string'                  },
            { name: 'categoryName',     type: 'string'                  },
            { name: 'text',             type: 'string',  nullable: true },
            { name: 'imageURL',         type: 'string',  nullable: true },
            { name: 'imageDescription', type: 'string',  nullable: true },
            { name: 'agentNotes',       type: 'string',  nullable: true },
            { name: 'personas',         type: 'json',    readOnly: true },
        ],
    },
    
    Transcript: {
        name          : 'Transcript',
        displayName   : 'Transcripts',
        primaryKey    : 'id',
        sequenceColumn: '_id',
        prismaIncludes: { problem: true },
        fields: [
            { name: 'id',               type: 'number',  readOnly: true },
            { name: 'problemId',        type: 'string'                  },
            { name: 'text',             type: 'string',  nullable: true },
            { name: 'imageURL',         type: 'string',  nullable: true },
            { name: 'imageDescription', type: 'string',  nullable: true },
            { name: 'agentNotes',       type: 'string',  nullable: true },
        ],
    },
    
    Chat: {
        name          : 'Chat',
        displayName   : 'Chats',
        primaryKey    : 'id',
        sequenceColumn: '_id',
        fields: [
            { name: 'id',           type: 'number',  readOnly: true },
            { name: 'userId',       type: 'number'                  },
            { name: 'completed',    type: 'boolean'                 },
            { name: 'creationTime', type: 'date',    readOnly: true },
            { name: 'updateTime',   type: 'date',    readOnly: true },
            { name: 'templateId',   type: 'number',  nullable: true },
        ],
    },
    
    LearningSequence: {
        name          : 'LearningSequence',
        displayName   : 'Learning Sequences',
        primaryKey    : ['chatId', 'transcriptId'],
        sequenceColumn: null,
        fields: [
            { name: 'chatId',         type: 'number' },
            { name: 'transcriptId',   type: 'number' },
            { name: 'whiteboardData', type: 'json',   nullable: true },
        ],
    },

    Message: {
        name          : 'Message',
        displayName   : 'Messages',
        primaryKey    : 'id',
        sequenceColumn: '_id',
        fields: [
            { name: 'id',           type: 'number',  readOnly: true },
            { name: 'chatId',       type: 'number'                  },
            { name: 'problemId',    type: 'string',  nullable: true },
            { name: 'transcriptId', type: 'number',  nullable: true },
            { name: 'agentId',      type: 'string',  nullable: true },
            { name: 'personaId',    type: 'string',  nullable: true },
            { name: 'text',         type: 'string'                  },
            { name: 'role',         type: 'string'                  },
            { name: 'agentMode',    type: 'string',  nullable: true },
            { name: 'creationTime', type: 'date',    readOnly: true },
            { name: 'updateTime',   type: 'date',    readOnly: true },
        ],
    },
    
    ChatTemplate: {
        name          : 'ChatTemplate',
        displayName   : 'Chat Templates',
        primaryKey    : 'id',
        sequenceColumn: 'id',
        fields: [
            { name: 'id',   type: 'number', readOnly: true },
            { name: 'name', type: 'string'                 },
        ],
    },
    
    ChatTemplateProblem: {
        name          : 'ChatTemplateProblem',
        displayName   : 'Chat Template Problems',
        primaryKey    : 'id',
        sequenceColumn: 'id',
        fields: [
            { name: 'id',             type: 'number', readOnly: true },
            { name: 'chatTemplateId', type: 'number'                 },
            { name: 'problemId',      type: 'string'                 },
            { name: 'order',          type: 'number'                 },
        ],
    },
    
    Settings: {
        name          : 'Settings',
        displayName   : 'Settings',
        primaryKey    : 'id',
        sequenceColumn: 'id',
        fields: [
            { name: 'id',                  type: 'number', readOnly: true },
            { name: 'global_instructions', type: 'string', nullable: true },
        ],
    },
    
    SettingsSwitch: {
        name          : 'SettingsSwitch',
        displayName   : 'Settings Switches',
        primaryKey    : 'id',
        sequenceColumn: 'id',
        fields: [
            { name: 'id',                  type: 'number',  readOnly: true },
            { name: 'settingsId',          type: 'number'                  },
            { name: 'isEnabled',           type: 'boolean'                 },
            { name: 'isMutualExclusive',   type: 'boolean'                 },
            { name: 'selectedOptionIndex', type: 'number',  nullable: true },
            { name: 'option1_label',       type: 'string',  nullable: true },
            { name: 'option1',             type: 'string',  nullable: true },
            { name: 'option2_label',       type: 'string',  nullable: true },
            { name: 'option2',             type: 'string',  nullable: true },
            { name: 'option3_label',       type: 'string',  nullable: true },
            { name: 'option3',             type: 'string',  nullable: true },
            { name: 'option4_label',       type: 'string',  nullable: true },
            { name: 'option4',             type: 'string',  nullable: true },
            { name: 'option5_label',       type: 'string',  nullable: true },
            { name: 'option5',             type: 'string',  nullable: true },
        ],
    },
};

/**
 * Returns the Prisma client accessor name for the given model by
 * lowercasing the first letter.
 *
 * @param model - A model name (e.g., {@code 'User'}, {@code 'ChatTemplate'})
 *
 * @returns The camelCase accessor name used on the Prisma client instance
 *          (e.g., {@code 'user'}, {@code 'chatTemplate'})
 */
export function prismaModelName(model: ModelName): string {
    return model.charAt(0).toLowerCase() + model.slice(1);
}
