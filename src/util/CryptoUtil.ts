// Library imports
import * as crypto from 'crypto';

/**
 * Generates a random string using only characters that can be used
 * in a URL without replacing them by their hex values.
 * 
 * @param {string} length - The length of the string in characters
 * 
 * @returns the random string
 */
export function generateRandomString(length: number): string {
    const safeCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_~';
    
    const randomBytes = crypto.randomBytes(length);
    let randomString  = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = randomBytes[i] % safeCharacters.length;
        randomString += safeCharacters.charAt(randomIndex);
    }
    
    return randomString;
}
