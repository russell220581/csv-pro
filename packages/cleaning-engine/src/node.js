import { Transform } from 'stream';
import { operations } from './operations.js';

/**
 * Creates a Node.js Transform stream that applies a recipe of cleaning operations.
 * This function is ONLY for use in a Node.js environment.
 */
export function createCleaningStream(recipe, initialHeaders) {
    let headers = [...initialHeaders];
    
    // First, process any header-only operations.
    for (const op of recipe) {
        const executor = operations[op.type]?.headerExecutor;
        if (executor) {
            headers = executor(headers, op.params);
        }
    }

    const statefulSets = {};

    return new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
            let modifiedRow = { ...row };
            let isRowFilteredOut = false;

            for (const op of recipe) {
                const definition = operations[op.type];
                if (!definition) continue;

                if (op.type === 'remove_duplicates') {
                    const uniqueKey = JSON.stringify(op.params.columns.sort());
                    if (!statefulSets[uniqueKey]) statefulSets[uniqueKey] = new Set();
                    const seenSet = statefulSets[uniqueKey];
                    const rowKey = op.params.columns.map(col => String(modifiedRow[col] || '').trim().toLowerCase()).join('||');
                    if (seenSet.has(rowKey)) isRowFilteredOut = true;
                    else seenSet.add(rowKey);
                }

                if (definition.rowExecutor) modifiedRow = definition.rowExecutor(modifiedRow, op.params, headers);
                if (definition.rowFilter && !definition.rowFilter(modifiedRow, op.params, headers)) isRowFilteredOut = true;
                if (isRowFilteredOut) break;
            }

            if (isRowFilteredOut) return callback();
            
            this.push(modifiedRow);
            callback();
        },
        flush(callback) {
            callback();
        }
    });
}

// Export operations for backend use
export { operations };