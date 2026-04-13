import { z } from "zod";
import { NewPasswordSchema } from "@/app/lib/zod_schemas";

// ------------------------------------- //
//   A U T H    M O D A L    S T A T E   //
// ------------------------------------- //
/**
 * The state for the authentication modal dialog
 */
export type AuthModalState = {
    isOpen: boolean;
    type: 'login' | 'signup' | 'forgotPassword';
};


// ---------------------------------- //
//   T Y P E    V A L I D A T I O N   //
// ---------------------------------- //
/**
 * Represents the hierarchical structure returned by `z.treeifyError()`.
 * Each node may contain its own list of `errors` and optional nested
 * `properties` or `shape` objects for deeper validation branches.
 */
export type TreeifiedFieldError = {
    errors?    : string[];
    properties?: Record<string, TreeifiedFieldError>;
    shape?     : Record<string, TreeifiedFieldError>;
};
/**
 * Represents the full validation error object (or `null` if validation passes)
 * produced by server-side form assertions such as `assertCredentials()`.
 */
export type AuthenticateError = TreeifiedFieldError | null;
/**
 * Generic type for any Zod treeified error.
 * You can reuse this across your app for form validation.
 */
export type FormattedZodError = ReturnType<typeof z.treeifyError>;
/**
 * Validation error type for {@link NewPasswordSchema}.
 * Produced by Zod's {@link z.treeifyError}, containing field-level `_errors`.
 */
export type NewPasswordError = ReturnType<typeof z.treeifyError<typeof NewPasswordSchema>>;

// ===================================== //
//     D   A   T   A   B   A   S   E     //
// ===================================== //
/**
 * User as stored in the database.
 */
export type DBUser = {
    email                     : string;
    name                      : string;
    isAdmin                   : boolean;
    isVerified                : boolean;
    forgotPasswordToken?      : string;
    forgotPasswordTokenExpiry?: Date;
    verifyToken?              : string;
    verifyTokenExpiry?        : Date;
    chats                     : DBChat[];
}

/**
 * The email types
 */
export enum EmailType {
    ACCOUNT_VERIFICATION, // Account verification
    RESET_PASSWORD        // Reset password
};

/**
 * Persona as stored in the database.
 */
export type DBPersona = {
    personaId     : string;
    name          : string;
    gender        : Gender;
    description   : string;
    initialMessage: string;
    instructions  : string | null;
    skills        : string | null;
    category      : string;
};

/**
 * Represents a persona with a precomputed embedding vector.
 *
 * This type extends the base `DBPersona` by including a numerical embedding
 * (e.g., from OpenAI's embedding model) corresponding to the persona's `initialMessage`.
 * These embeddings are used to compute semantic similarity between user input
 * and each persona's prompt for intelligent persona selection.
 */
export type CachedDBPersona = DBPersona & {
    embedding: number[];
};

/**
 * Problem as stored in the database.
 */
export type DBProblem = {
    problemId  : string;
    title           : string;
    category        : string;
    text            : string | null;
    imageURL        : string | null;
    imageDescription: string | null;
    agentNotes      : string | null;
    personas        : DBPersona[];
    transcripts     : DBTranscript[];
};

/**
 * Transcript as stored in the database.
 */
export type DBTranscript = {
    id              : number;
    problemId       : string;
    problem         : DBProblem;
    text            : string | null;
    imageURL        : string | null;
    imageDescription: string | null;
    agentNotes      : string | null;
};

/**
 * Message as stored in the database.
 */
export type DBMessage = {
    id          : number;
    text        : string;
    role        : string;
    agentMode   : string | null;
    persona     : DBPersona | null;
    creationTime: Date;
    updateTime  : Date;
};

/**
 * Excalidraw whiteboard state persisted per learning sequence.
 */
export type WhiteboardData = {
    elements : Record<string, unknown>[];
    appState?: Record<string, unknown>;
};

/**
 * LearningSequence as stored in the database.
 */
export type DBLearningSequence = {
    chatId        : number;
    transcript    : DBTranscript;
    messages      : DBMessage[];
    whiteboardData: WhiteboardData | null;
};


/**
 * Chat as stored in the database.
 */
export type DBChat = {
    id               : number;
    templateId       : number | null;
    completed        : boolean;
    creationTime     : Date;
    updateTime       : Date;
    learningSequences: DBLearningSequence[];
    meetAgentChats   : Record<string, DBMessage[]>;
};

/**
 * ChatTemplate as stored in the database.
 */
export type DBChatTemplate = {
    id        : number;
    name      : string;
    problemIds: string[];
};

/**
 * Settings switchas stored in the database.
 */
export type DBSettingsSwitch = {
    id                 : number;
    isEnabled          : boolean;
    isMutualExclusive  : boolean;
    selectedOptionIndex: number | null;
    option1_label      : string | null;
    option1            : string | null;
    option2_label      : string | null;
    option2            : string | null;
    option3_label      : string | null;
    option3            : string | null;
    option4_label      : string | null;
    option4            : string | null;
    option5_label      : string | null;
    option5            : string | null;
}

/**
 * Settings as stored in the database.
 */
export type DBSettings = {
    switches           : DBSettingsSwitch[];
    global_instructions: string | null;
}

/**
 * Extends a database-stored settings switch with transient UI state.
 * 
 * Represents a single settings switch as displayed on the client, including
 * the user's current selection. This selection is not persisted to the database.
 * 
 * - If `isMutualExclusive` is `true`, `selection` holds a single selected index (1–5).
 * - If `isMutualExclusive` is `false`, `selection` holds an array of selected indices.
 */
export type SettingsSwitchState = DBSettingsSwitch & {
    // Current user selection:
    // - number: index of selected option (1–5) for mutual-exclusive switches
    // - number[]: array of selected option indices for multi-select switches
    selection: number | number[];
};

/**
 * Represents the full settings state used by the client application.
 * 
 * Includes all enabled switches, augmented with selection state,
 * as well as optional global instructions. This type is used only on
 * the client and is derived from DBSettings by adding transient UI fields.
 */
export type Settings = {
    speech             : boolean;
    switches           : SettingsSwitchState[];
    global_instructions: string | null;
};

/**
 * The sender role ('assistant', 'system' or 'user')
 */
export enum Role {
    ASSISTANT = 'assistant',
    SYSTEM    = 'system',
    USER      = 'user'
};

/**
 * The persona gender
 */
export enum Gender {
    MALE   = 'male',
    FEMALE = 'female'
};

/**
 * Enum representing available text-to-speech service providers.
 * 
 * This is used to select the backend service for converting text into speech.
 */
export enum TextToSpeechProvider {
    /** Uses OpenAI's text-to-speech API */
    OpenAI,
    /** Uses ElevenLabs' API for high-quality neural voice synthesis */
    ElevenLabs,
    /** Uses the Web Speech API built into modern browsers for basic TTS */
    WebSpeech
};


// ================== //
//   C H A T   G P T  //
// ================== //
/**
 * Message used in chat interaction (i.e., user message or chatbot response).
 */
export type ChatMessage = {
    id       : number;
    role     : Role;
    personaId: string | null;
    name     : string | null;
    text     : string;
}

/**
 * The format of the OpenAI ChatGPT messages
 */
export type ChatGPTMessage = {
    role   : 'assistant' | 'system' | 'user';
    content: string;
}

/**
 * The stream payload sent to OpenAI
 */
export type OpenAIStreamPayload = {
    model            : string;
    messages         : ChatGPTMessage[];
    temperature      : number;
    top_p            : number;
    frequency_penalty: number;
    presence_penalty : number;
    max_tokens       : number;
    stream           : boolean;
    n                : number;
}

/**
 * The type of the message context
 */
export type MessageContextType = {
    messages            : ChatMessage[];
    addMessage          : (message: ChatMessage) => void; // To add a new message
    removeMessage       : (id: number) => void;           // To remove a message in case something goes wrong
    updateMessage       : (id: number, updateFn: (prevText: string) => string) => void;
    isMessageUpdating   : boolean;                         // true while we are receiving message chunks
    setIsMessageUpdating: (isUpdating: boolean) => void;
    replaceMessages     : (newMessages: ChatMessage[]) => void; 
}
