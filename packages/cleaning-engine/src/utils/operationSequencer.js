/**
 * Smart operation sequencer to ensure optimal execution order
 * and prevent conflicts between cleaning operations
 */

// Operation execution priorities (higher = executed later)
const OPERATION_PRIORITIES = {
    // Structural operations first (they change column structure)
    'remove_columns': 100,
    'extract_address_components': 100,
    
    // Data removal operations
    'remove_empty_rows': 90,
    'remove_duplicates': 90,
    
    // Data validation and cleaning
    'handle_mismatched_types': 80,
    'validate_postal_code': 80,
    
    // Text formatting and cleaning
    'trim_whitespace': 70,
    'remove_html': 70,
    'format_email': 70,
    'clean_numbers': 70,
    
    // Case conversion
    'change_case': 60,
    'format_name_titlecase': 60,
    'format_sentence_case': 60,
    'smart_case_conversion': 60,
    
    // Data formatting (should happen after cleaning)
    'format_date': 50,
    'format_phone': 50,
    'smart_format_phone': 50,
    'smart_format_postal_code': 50,
    'convert_to_slug': 50,
    
    // Find and replace (should be last as it might depend on formatted data)
    'find_and_replace': 40,
};

// Operation conflicts - operations that shouldn't run together on same column
const OPERATION_CONFLICTS = {
    'change_case': ['format_name_titlecase', 'format_sentence_case', 'smart_case_conversion'],
    'format_name_titlecase': ['change_case', 'format_sentence_case', 'smart_case_conversion'],
    'format_sentence_case': ['change_case', 'format_name_titlecase', 'smart_case_conversion'],
    'smart_case_conversion': ['change_case', 'format_name_titlecase', 'format_sentence_case'],
    
    'format_phone': ['smart_format_phone'],
    'smart_format_phone': ['format_phone'],
    
    'validate_postal_code': ['smart_format_postal_code'],
    'smart_format_postal_code': ['validate_postal_code'],
};

/**
 * Sort operations in optimal execution order
 */
export const sortOperations = (operations) => {
    return [...operations].sort((a, b) => {
        const priorityA = OPERATION_PRIORITIES[a.type] || 50;
        const priorityB = OPERATION_PRIORITIES[b.type] || 50;
        return priorityB - priorityA; // Higher priority first
    });
};

/**
 * Detect and resolve conflicts between operations
 */
export const resolveConflicts = (operations) => {
    const resolved = [];
    const columnOperations = new Map(); // Track operations per column
    
    for (const operation of operations) {
        const columns = getOperationColumns(operation);
        let hasConflict = false;
        
        // Check for conflicts with existing operations
        for (const column of columns) {
            const existingOps = columnOperations.get(column) || [];
            for (const existingOp of existingOps) {
                if (hasConflictWith(operation, existingOp)) {
                    console.warn(`Conflict detected: ${operation.type} conflicts with ${existingOp.type} on column ${column}`);
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) break;
        }
        
        if (!hasConflict) {
            resolved.push(operation);
            // Track this operation's columns
            for (const column of columns) {
                if (!columnOperations.has(column)) {
                    columnOperations.set(column, []);
                }
                columnOperations.get(column).push(operation);
            }
        }
    }
    
    return resolved;
};

/**
 * Get all columns affected by an operation
 */
const getOperationColumns = (operation) => {
    const columns = [];
    
    if (operation.params.column) {
        columns.push(operation.params.column);
    }
    
    if (operation.params.columns && Array.isArray(operation.params.columns)) {
        columns.push(...operation.params.columns);
    }
    
    if (operation.params.addressColumn) {
        columns.push(operation.params.addressColumn);
    }
    
    return columns;
};

/**
 * Check if two operations conflict
 */
const hasConflictWith = (op1, op2) => {
    // Same operation type always conflicts
    if (op1.type === op2.type) return true;
    
    // Check defined conflicts
    const conflicts = OPERATION_CONFLICTS[op1.type] || [];
    if (conflicts.includes(op2.type)) return true;
    
    // Check if they operate on the same columns
    const op1Columns = getOperationColumns(op1);
    const op2Columns = getOperationColumns(op2);
    const sharedColumns = op1Columns.filter(col => op2Columns.includes(col));
    
    return sharedColumns.length > 0;
};

/**
 * Optimize operation sequence for best results
 */
export const optimizeOperationSequence = (operations) => {
    // Step 1: Resolve conflicts
    const conflictFree = resolveConflicts(operations);
    
    // Step 2: Sort by priority
    const sorted = sortOperations(conflictFree);
    
    // Step 3: Group similar operations for efficiency
    return groupSimilarOperations(sorted);
};

/**
 * Group similar operations to reduce processing overhead
 */
const groupSimilarOperations = (operations) => {
    const groups = {
        structural: [],
        validation: [],
        formatting: [],
        text: [],
        other: []
    };
    
    operations.forEach(op => {
        if (op.type.includes('remove_') || op.type.includes('extract_')) {
            groups.structural.push(op);
        } else if (op.type.includes('validate_') || op.type.includes('handle_mismatched')) {
            groups.validation.push(op);
        } else if (op.type.includes('format_') || op.type.includes('smart_format')) {
            groups.formatting.push(op);
        } else if (op.type.includes('case') || op.type.includes('trim') || op.type.includes('find_and_replace')) {
            groups.text.push(op);
        } else {
            groups.other.push(op);
        }
    });
    
    // Return in optimal group order
    return [
        ...groups.structural,
        ...groups.validation, 
        ...groups.formatting,
        ...groups.text,
        ...groups.other
    ];
};

/**
 * Validate operation sequence for potential issues
 */
export const validateOperationSequence = (operations) => {
    const warnings = [];
    const columns = new Set();
    
    // Track all columns that will be removed
    const columnsToRemove = new Set();
    operations.forEach(op => {
        if (op.type === 'remove_columns' && op.params.columns) {
            op.params.columns.forEach(col => columnsToRemove.add(col));
        }
    });
    
    // Check for operations on columns that will be removed
    operations.forEach(op => {
        const opColumns = getOperationColumns(op);
        opColumns.forEach(col => {
            if (columnsToRemove.has(col)) {
                warnings.push({
                    type: 'removed_column_operation',
                    message: `Operation "${op.type}" uses column "${col}" which will be removed`,
                    operation: op,
                    column: col
                });
            }
        });
    });
    
    return warnings;
};