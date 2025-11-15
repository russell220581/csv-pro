import { z } from 'zod';

// This collection of schemas is used for both client-side analysis and backend validation.
export const dataValidationSchemas = {
    email: z.string().email(),
    url: z.string().url(),
    /**
     * A robust number schema that accepts optional signs, currency symbols, and commas,
     * then coerces the final result to a JavaScript number.
     */
    number: z.string()
        .regex(
            /^\s*[-+]?(\$?\d{1,3}(,\d{3})*|\d+)(\.\d+)?\s*$/,
            'Must be a valid number format'
        )
        .pipe(z.coerce.number()),
    /**
     * A flexible date schema that attempts to coerce various string formats into a Date object.
     */
    date: z.coerce.date(),
};