import OperationPreprocessor from '../OperationPreprocessor.js';

// Enhanced operation categories for better sequencing
const OPERATION_CATEGORIES = {
    HEADER_OPS: ['standardize_headers', 'remove_columns', 'rename_columns'],
    STRUCTURAL_OPS: ['remove_empty_rows', 'remove_duplicates', 'fuzzy_remove_duplicates'],
    CLEANING_OPS: ['trim_whitespace_all', 'trim_whitespace', 'remove_html', 'clean_numbers'],
    FORMATTING_OPS: [
        'change_case', 'smart_case_conversion', 'format_email', 
        'format_date', 'smart_format_phone', 'smart_format_postal_code',
        'format_currency'
    ],
    VALIDATION_OPS: ['handle_mismatched_types', 'validate_postal_code'],
    ANALYSIS_OPS: ['find_similar_values', 'column_level_deduplication'],
    ENRICHMENT_OPS: ['extract_address_components', 'convert_to_slug']
};

// Operation priority within categories (lower = earlier)
const OPERATION_PRIORITY = {
    'standardize_headers': 1,
    'trim_whitespace_all': 2,
    'remove_empty_rows': 3,
    'trim_whitespace': 4,
    'remove_html': 5,
    'clean_numbers': 6,
    'format_email': 7,
    'format_date': 8,
    'smart_format_phone': 9,
    'smart_format_postal_code': 10,
    'format_currency': 11,
    'change_case': 12,
    'smart_case_conversion': 13,
    'handle_mismatched_types': 14,
    'validate_postal_code': 15,
    'remove_duplicates': 90,
    'fuzzy_remove_duplicates': 91,
    'find_similar_values': 92,
    'column_level_deduplication': 93,
    'extract_address_components': 94,
    'convert_to_slug': 95,
    'remove_columns': 96
};

/**
 * Optimizes operation sequence for better performance and correctness
 */
export function optimizeOperationSequence(operations) {
    if (!operations || operations.length === 0) {
        return [];
    }

    // First, use the preprocessor to validate and deduplicate
    const preprocessor = new OperationPreprocessor();
    const preprocessed = preprocessor.preprocessOperations(operations);
    
    const validOperations = preprocessed.operations;

    // Categorize operations
    const categorized = categorizeOperations(validOperations);
    
    // Sort operations within each category by priority
    const sortedOps = [];
    
    // Apply operations in logical order
    sortedOps.push(...sortOperations(categorized.HEADER_OPS));
    sortedOps.push(...sortOperations(categorized.STRUCTURAL_OPS));
    sortedOps.push(...sortOperations(categorized.CLEANING_OPS));
    sortedOps.push(...sortOperations(categorized.FORMATTING_OPS));
    sortedOps.push(...sortOperations(categorized.VALIDATION_OPS));
    sortedOps.push(...sortOperations(categorized.ANALYSIS_OPS));
    sortedOps.push(...sortOperations(categorized.ENRICHMENT_OPS));

    // Remove any null/undefined operations
    const finalOps = sortedOps.filter(op => op != null);
    
    console.log('Operation sequencing completed:', {
        original: operations.length,
        validated: validOperations.length,
        final: finalOps.length,
        byCategory: {
            headers: categorized.HEADER_OPS.length,
            structural: categorized.STRUCTURAL_OPS.length,
            cleaning: categorized.CLEANING_OPS.length,
            formatting: categorized.FORMATTING_OPS.length,
            validation: categorized.VALIDATION_OPS.length,
            analysis: categorized.ANALYSIS_OPS.length,
            enrichment: categorized.ENRICHMENT_OPS.length
        }
    });

    return finalOps;
}

function categorizeOperations(operations) {
    const categorized = {
        HEADER_OPS: [],
        STRUCTURAL_OPS: [],
        CLEANING_OPS: [],
        FORMATTING_OPS: [],
        VALIDATION_OPS: [],
        ANALYSIS_OPS: [],
        ENRICHMENT_OPS: []
    };

    operations.forEach(operation => {
        let categorizedFlag = false;

        // Check each category
        for (const [category, types] of Object.entries(OPERATION_CATEGORIES)) {
            if (types.includes(operation.type)) {
                categorized[category].push(operation);
                categorizedFlag = true;
                break;
            }
        }

        // If not categorized, assign based on type
        if (!categorizedFlag) {
            if (operation.type.includes('format') || operation.type.includes('case')) {
                categorized.FORMATTING_OPS.push(operation);
            } else if (operation.type.includes('remove') || operation.type.includes('duplicate')) {
                categorized.STRUCTURAL_OPS.push(operation);
            } else if (operation.type.includes('trim') || operation.type.includes('clean')) {
                categorized.CLEANING_OPS.push(operation);
            } else {
                // Default to cleaning operations
                categorized.CLEANING_OPS.push(operation);
            }
        }
    });

    return categorized;
}

function sortOperations(operations) {
    return operations.sort((a, b) => {
        const priorityA = OPERATION_PRIORITY[a.type] || 50;
        const priorityB = OPERATION_PRIORITY[b.type] || 50;
        return priorityA - priorityB;
    });
}

/**
 * Validates if operation sequence is logically sound
 */
export function validateOperationSequence(operations) {
    const warnings = [];
    const appliedOps = new Set();
    
    operations.forEach((op, index) => {
        // Check for duplicate operations
        const opKey = `${op.type}:${JSON.stringify(op.params || {})}`;
        if (appliedOps.has(opKey)) {
            warnings.push(`Duplicate operation at position ${index}: ${op.type}`);
        }
        appliedOps.add(opKey);
        
        // Operation-specific validations
        if (op.type === 'trim_whitespace' && appliedOps.has('trim_whitespace_all')) {
            warnings.push(`Redundant operation: trim_whitespace after trim_whitespace_all at position ${index}`);
        }
        
        if (op.type === 'change_case' && appliedOps.has('smart_case_conversion')) {
            warnings.push(`Potential conflict: change_case after smart_case_conversion at position ${index}`);
        }
    });
    
    return {
        valid: warnings.length === 0,
        warnings
    };
}

// Maintain backward compatibility
export default {
    optimizeOperationSequence,
    validateOperationSequence
};