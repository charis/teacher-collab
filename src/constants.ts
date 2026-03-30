import { TextToSpeechProvider } from "@/types";

// ----------------------   A U T H O R I Z A T I O N   --------------------- //
/** The host URL */
export const HOST_URL = process.env.HOST_URL ?? 'http://localhost:3000';
//export const HOST_URL = process.env.HOST_URL ?? 'https://<myapp>.vercel.app'

/** The URL to log in */
export const LOGIN_URL = HOST_URL + '/api/login';

/** How long it takes for the toast to auto-close */
export const TOAST_DURATION = 3000; // 3 seconds

/** Token expiry in hours from the moment when the token is created */
export const TOKEN_EXPIRY_IN_HOURS = 24;

// ------------------------------   C H A T S   ----------------------------- //
/**
 * The default title for new chats
 */
export const NEW_CHAT_TITLE = 'NEW CHAT';

/**
 * Indicates there is no active chat
 */
export const NO_ACTIVE_CHAT_ID = -1;
/**
 * Indicates there is all chats are completed
 */
export const NO_CHAT_ID_LEFT = -100;
/**
 * The parent message ID of the top-level message in a chat.
 */
export const CHAT_ROOT_PARENT_MESSAGE_ID = '0';

/**
 * Indicates that the chat ID does not exist
 */
export const NON_EXISTING_CHAT_ID = "non-existing chat ID"

/**
 * Min number of interactions before a chat is considered complete
 * In one-on-one conversations, this specifies the number of interactions
 * required before the next agent joins the conversation.
 */
export const MIN_INTERACTIONS = 3;

// ------------------ L E A R N I N G   S E Q U E N C E S   ----------------- //
/**
 * Prefix to skip the problem ID when looking up the problem summary in the sidebar
 */
export const PROBLEM_ID_PREFIX_TO_SKIP = "meet-the-agents_";

// -----------------------------   S P E E C H   ---------------------------- //
/**
 * The text-to-speech service provider
 */
export const TTS_SERVICE_PROVIDER = TextToSpeechProvider.OpenAI;

// --------------------------   C H A T     G P T  -------------------------- //
/** The prompt for ChatGTP */
export const GENERAL_SYSTEM_PROMPT = process.env.GENERAL_SYSTEM_PROMPT

/** The ChatGPT model */
export const CHAT_GPT_MODEL = process.env.OPEN_AI_MODEL || 'gpt-4o';
