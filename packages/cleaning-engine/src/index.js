import { operations } from './operations.js';
import { cleanHeaders } from './utils/helpers.js';
import { optimizeOperationSequence, validateOperationSequence } from './utils/operationSequencer.js';

/**
 * The main function to run the cleaning engine on a dataset (for previews).
 */
export const runEngine = (data, operationsList) => {
    if (!data || !data.headers || !data.data) {
        console.warn('Invalid data format provided to runEngine');
        return { data: [], headers: [] };
    }

    let currentHeaders = [...data.headers];
    let currentData = [...data.data];

    // Apply header transformations first
    operationsList.forEach(operation => {
        const opInfo = operations[operation.type];
        if (opInfo && opInfo.headerExecutor) {
            currentHeaders = opInfo.headerExecutor(currentHeaders, operation.params);
        }
    });

    // Apply row transformations and filters
    operationsList.forEach(operation => {
        const opInfo = operations[operation.type];
        if (!opInfo) return;

        // Apply row filter if available
        if (opInfo.rowFilter) {
            currentData = currentData.filter(row => 
                opInfo.rowFilter(row, operation.params, currentHeaders)
            );
        }

        // Apply row executor if available
        if (opInfo.rowExecutor) {
            currentData = currentData.map(row => 
                opInfo.rowExecutor({ ...row }, operation.params, currentHeaders)
            );
        }
    });

    return {
        data: currentData,
        headers: currentHeaders,
    };
};

// Export helper functions
export const getAvailableOperations = () => operations;
export const validateOperations = (operationsList) => {
    const errors = [];
    operationsList.forEach((op, index) => {
        const opInfo = operations[op.type];
        if (!opInfo) {
            errors.push(`Unknown operation type: ${op.type} at index ${index}`);
            return;
        }
        try {
            opInfo.schema.parse(op.params);
        } catch (error) {
            errors.push(`Invalid parameters for ${op.type} at index ${index}: ${error.errors?.map(e => e.message).join(', ')}`);
        }
    });
    return { isValid: errors.length === 0, errors };
};
export const getOperationInfo = (operationType) => operations[operationType] || null;
export const isOperationAvailable = (operationType, userPlan = 'free') => {
    const opInfo = operations[operationType];
    if (!opInfo) return false;
    if (userPlan === 'premium') return true;
    return !opInfo.isPremium;
};

export { cleanHeaders, optimizeOperationSequence, validateOperationSequence };

export default {
    runEngine,
    cleanHeaders,
    getAvailableOperations,
    validateOperations,
    getOperationInfo,
    isOperationAvailable,
    optimizeOperationSequence,
    validateOperationSequence,
    operations
};