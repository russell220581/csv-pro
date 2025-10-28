import { z } from 'zod';
import { createCleaningStream, operations } from '@cleaning-engine/node';

// Dynamically build a Zod schema from our central `operations` object.
// This ensures our backend validation is ALWAYS in sync with the engine.
const operationSchemas = Object.entries(operations).map(([type, opInfo]) => {
    // Each operation must have a 'type' field that matches its key.
    return z.object({
        type: z.literal(type),
        params: opInfo.schema, // The 'schema' property we defined for each operation
        // The frontend adds a temporary 'id', so we'll allow it.
        id: z.number().optional(), 
    });
});

// The final schema is a union of all possible operation objects, wrapped in an array.
// This means a valid recipe is an array where each element matches one of our operation schemas.
export const recipeSchema = z.array(z.union(operationSchemas));