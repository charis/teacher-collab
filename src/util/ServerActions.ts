"use server"

// Library imports
import getServerSession from 'next-auth';
import {z} from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/config';
// Custom imports
import * as dbUtils from "@/util/DBUtil"
import { AuthenticateUserSchema,
         CreateUserSchema,
         NewPasswordSchema } from "@/app/lib/zod_schemas"
import { AuthenticateError, DBUser, FormattedZodError, NewPasswordError } from "@/types"


/**
 * Gets the authenticated user.
 * 
 * @returns the authenticated user or {@code null} if no user is logged in
 */
export async function getSessionUser(): Promise<DBUser | null> {
    try {
        const session = (await getServerSession(authOptions)) as {
            user?: { email?: string } 
        } | null;
        
        const user = session?.user;
        
        if (!user?.email) {
            return null;
        }
        
        return await dbUtils.getUser(user.email, false);
    }
    catch (error) {
        console.log("Error getting the server session: " + error)
        
        return null;
    }
}


/**
 * Extracts the information from the passed form data to create a new user in the database.
 * 
 * @param {FormData} userInfo - The form data that contains the information about the user
 * @param {boolean} isAdmin - {@code true} if the user has administrative privileges or
 *                            {@code false} otherwise
 * 
 * @return a formatted error message if there is a validaton error or a string if this is an error
 *         message from the database operation or {@code null} if the task completed successfully
 */
export async function createUserInDB(userInfo: FormData,
                                     isAdmin : boolean) :
       Promise<FormattedZodError | string | null> {
    const { email, name, password } = Object.fromEntries(userInfo)
    const zodResult = CreateUserSchema.safeParse({email, name, password})
    if (!zodResult.success) {
        // `z.treeifyError()` replaces the deprecated `error.format()`/
        return z.treeifyError(zodResult.error)
    }
    
    const [, error] = await dbUtils.createUser(email    as string,
                                               name     as string,
                                               password as string,
                                               isAdmin)
    return error
}


/**
 * Extracts the information from the passed form data to assert the user credentials.
 * 
 * @param {FormData} credentials - The form data that contains the user credentials
 * 
 * @returns a ZodFormattedError in case of invalid input or {@code null} if the input is valid
 */
export async function assertCredentials(credentials: FormData): Promise<AuthenticateError | null> {
    const { email, password } = Object.fromEntries(credentials) as {
        email?: string;
        password?: string;
      };
    const zodResult = AuthenticateUserSchema.safeParse({email, password});
    if (!zodResult.success) {
        // `z.treeifyError()` replaces deprecated `.format()`
        return z.treeifyError(zodResult.error)  as AuthenticateError;
    }
    
    return null;
}

/**
 * Extracts the information from the passed form data to assert the new password
 * and the password confirmation.
 * 
 * @param {FormData} credentials - The form data that contains the new passowrd
 *                                 and the new password confirmation
 * 
 * @returns a ZodFormattedError in case of invalid passwords or {@code null} if
 *          the passwords match and are valid.
 */
export async function assertNewPasswordForm(passwords: FormData): Promise<NewPasswordError  | null> {
    const { newPassword, passwordConfirm } = Object.fromEntries(passwords);
    const zodResult = NewPasswordSchema.safeParse({newPassword,passwordConfirm});
    if (!zodResult.success) {
        // `z.treeifyError()` replaces deprecated `.format()`
        return z.treeifyError(zodResult.error) as NewPasswordError;
    }
    
    return null;
}

/**
 * Adds a verification token for the specified user.
 * 
 * @param {string} email - The email for the user to add the verification token
 * @param {string} token - The verification token
 * @param {Date} expiry - The time when the token will expire
 * 
 * @return {@code null} if the task completed successfully or an error message
 *         if there was an error.
 */
export async function addVerificationToken(email: string,
                                           token: string,
                                           expiry: Date) : 
             Promise<string | null> {
    const [, error] = await dbUtils.updateUser(
        email,      // currEmail
        undefined,  // newEmail
        undefined,  // newName
        undefined,  // newPassword
        undefined,  // isAdmin
        undefined,  // isVerified
        undefined,  // forgotPasswordToken
        undefined,  // forgotPasswordTokenExpiry
        token,      // verifyToken
        expiry      // verifyTokenExpiry
    )
    
    return error;
}

/**
 * Adds a forgot password token for the specified user.
 * 
 * @param {string} email - The email for the user to add the forgot password token
 * @param {string} token - The password reset token
 * @param {Date} expiry - The time when the token will expire
 * 
 * @return {@code null} if the task completed successfully or an error message if there was an error
 */
export async function addForgotPasswordToken(email: string,
                                             token: string,
                                             expiry: Date) : Promise<string | null> {
    const [, error] = await dbUtils.updateUser(
        email,      // currEmail
        undefined,  // newEmail
        undefined,  // newName
        undefined,  // newPassword
        undefined,  // isAdmin
        undefined,  // isVerified
        token,      // forgotPasswordToken
        expiry,     // forgotPasswordTokenExpiry
        undefined,  // verifyToken
        undefined   // verifyTokenExpiry
    )
    
    return error;
}

/**
 * Validates the given token.
 * A token is valid if it exists in the database and has not expired.
 * 
 * @param {string} token - The token to validate
 * 
 * @return {@code true} if the token is found and has not expired or {@code false} otherwise
 */
export async function validateVerificationToken(token: string): Promise<boolean> {
    try {
        const [success, error] = await dbUtils.verifyUser(token);
        if (error) {
            console.log(error);
        }
        return success;
    }
    catch (error) {
        console.log(error);
        return false;
    }
}

/**
 * Validates the given token and if the token is valid it sets the
 * new password.
 * A token is valid if it exists in the database and has not expired.
 * 
 * @param {string} token - The token to validate
 * @param {string} newPassword - The new password
 * 
 * @return {@code true} if the token is found and has not expired or
 *         {@code false} otherwise
 */
export async function resetPassword(token      : string,
                                    newPassword: string ): Promise<boolean> {
    try {
        const [success, error] = await dbUtils.resetPassword(token, newPassword);
        if (error) {
            console.log(error);
        }
        return success;
    }
    catch (error) {
        console.log(error);
        return false;
    }
}
