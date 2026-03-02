// Library imports
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
// Custom imports
import type { TreeifiedFieldError } from "@/types";

/**
 * Helper funtion to merge class names.
 * 
 * @param inputs The class names to merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a random integer between the specified minimum and maximum values (inclusive).
 *
 * @param min - The minimum integer value (inclusive)
 * @param max - The maximum integer value (inclusive)
 * 
 * @returns a random integer between min and max, inclusive
 * 
 * @throws Error if min is greater than max.
 */
export function getRandomIntegerInRange(min: number, max: number): number {
    if (min > max) {
        throw new Error("Minimum value cannot be greater than maximum value.");
    }
    
    const minCeil = Math.ceil(min);
    const maxFloor = Math.floor(max);
    
    return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
}

/**
 * Helper function to extract the error messages array for a given field from
 * the nested z.treeifyError() structure.
 * Returns an empty array when no messages are present.
 */
export function extractFieldError(error: TreeifiedFieldError | null,
                                  field: string): string[] {
    if (!error) {
        return [];
    }
    
    // Try common nested shapes we have seen from z.treeifyError
    // 1) properties.shape.properties.field.errors
    const p1 = error.properties?.shape?.properties?.[field]?.errors;
    // 2) properties.field.errors
    const p2 = error.properties?.[field]?.errors;
    // 3) shape.field.errors
    const p3 = error.shape?.[field]?.errors;
    // 4) top-level errors
    const p4 = error.errors;
    
    return p1 ?? p2 ?? p3 ?? p4 ?? [];
}

/**
 * Races a promise against a timeout and rejects if the timeout elapses first.
 * Returns a promise that resolves or rejects with the same value/reason as the  
 * supplied promise {@code p} if it settles before the timeout. If the timeout
 * fires first the returned promise is rejected with an {@code Error} whose
 * message includes the timeout duration and optional {@code label}. The helper
 * clears the timer when either branch settles to avoid leaks.
 * 
 * Important: This wrapper does not cancel or otherwise abort the original
 *            promise {@code p}; it only rejects the wrapper when the timeout
 *            elapses. If you need cancellation you must handle aborting {@code p}
 *            separately (for example via an {@code AbortController} or an
 *            abort-capable API).
 *
 * @template T
 * @param p       - The promise to race against the timeout
 * @param ms      - Timeout in milliseconds after which the wrapper rejects if
 *                  {@code p} has not settled
 * @param [label] - Optional short label to include in the timeout error message for easier debugging.
 * 
 * @returns a promise that resolves/rejects with the same outcome as {@code p}
 *          if it settles before the timeout, otherwise rejects with an {@code Error}
 *          indicating the timeout
 * 
 * @throws an error when the timeout elapses before {@code p} settles (the error
 *         message will be in the form: "Timed out after {ms}ms{ (label) }").
 */
export async function promiseWithTimeout<T>(p     : Promise<T>,
                                            ms    : number,
                                            label?: string): Promise<T> {
    let timer: number | undefined;
    
    const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
            reject(new Error(`Timed out after ${ms}ms${label ? ` (${label})` : ''}`));
        }, ms);
    });
    
    try {
        const result = await Promise.race([p, timeout]);
        return result as T;
    }
    finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

/**
 * Returns the content between the first matching opening and closing HTML-like
 * tag.
 *
 * This function searches for the first occurrence of `<tag ...>...</tag>` in
 * the provided text and returns the inner content.
 *
 * Notes:
 * - Supports attributes on the opening tag (e.g. `<tag id="x">...</tag>`).
 * - Returns an empty string if no matching tag pair is found.
 * - Does NOT fully parse HTML; nested occurrences of the same tag may not
 *   behave as an XML/HTML parser would.
 *
 * @param text     - The input string containing the tag
 * @param tagLabel - The tag name to search for (e.g. "div", "test")
 * 
 * @returns the inner content between `<tag ...>` and `</tag>` if found or
 *          {@code null} otherwise
 */
export function getTagContent(text    : string,
                              tagLabel: string): string | null {
    if (!tagLabel) {
        return null;
    }
    
    // Escape any regex meta-characters in the tag name
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const escapedTag = escapeRegExp(tagLabel);
    // Match opening tag with optional attributes, capture inner content
    // non-greedily, then closing tag
    const regex =
          new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
  
    const match = regex.exec(text);
    return match ? match[1] : null;
}
