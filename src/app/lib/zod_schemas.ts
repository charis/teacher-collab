// Library imports
import { z } from 'zod';

/**
 * Validation schema for the required field values in a client form before creating a new user
 * in the database (i.e., DBUser).
 */
export const CreateUserSchema = z.object({
    email: z.string().min(3, { message: "Email is required" }), // Email has at least 3 characters
    name: z.string().min(1, { message: "Name is required" }),
    password: z.string().min(6, { message: "Must be 6 characters or longer." }),
});

/**
 * Validation schema for the required field values in a client form before authenticating a user.
 */
export const AuthenticateUserSchema = z.object({
    email: z.string().min(8, { message: "Email is required" }), // Email has at least 8 characters
    password: z.string().min(6, { message: "Must be 6 characters or longer." }),
});

/**
 * Validation schema for the required field values in a client form to set a new password.
 */
export const NewPasswordSchema = z.object({
    newPassword: z.string().min(6, { message: "Must be 6 characters or longer." }),
    passwordConfirm: z.string().min(6, { message: "Must be 6 characters or longer." }),
}).refine(data => data.newPassword === data.passwordConfirm, {
    message: "The passwords must match",
    path: ["passwordConfirm"],
});

/**
 * Validation schema for the required fields to create a ChatMessage
 * (i.e., ChatGPT message).
 */
export const ChatMessageSchema = z.object({
    role: z.enum(["user", "assistant", "system"])
           .refine(val => !!val, { message: "role is required" })
           .describe("role must be 'user', 'assistant', or 'system'"),
    
    content: z.string()
              .min(1, { message: "content must be 1 character or longer" })
              .refine(val => !!val, { message: "content is required" }),
});

/**
 * Validation schema for the required fields to create an array of
 * ChatMessage objects (i.e., ChatGPT message history).
 */
export const ChatMessageHistorySchema = z.array(ChatMessageSchema);
