class OperationPreprocessor {
    constructor() {
        this.operationDependencies = {
            // GLOBAL HEADER OPERATIONS
            'standardize_headers': { priority: 1, conflicts: [] },
            'standardize_columns': { priority: 2, conflicts: [] },
            
            // GLOBAL CLEANING OPERATIONS
            'trim_whitespace_all': { priority: 3, conflicts: [] },
            'remove_empty_cells': { priority: 4, conflicts: [] },
            'trim_whitespace': { priority: 5, conflicts: ['trim_whitespace_all'] },
            
            // GLOBAL DATA TYPE OPERATIONS
            'clean_numbers': { priority: 6, conflicts: [] },
            'remove_non_numeric': { priority: 7, conflicts: [] },
            'format_currency': { priority: 8, conflicts: [] },
            'standardize_boolean': { priority: 9, conflicts: [] },
            
            // GLOBAL CONTACT DATA OPERATIONS
            'format_email': { priority: 10, conflicts: [] },
            'smart_format_phone': { priority: 11, conflicts: [] },
            'format_phone': { priority: 12, conflicts: [] },
            
            // GLOBAL DATE OPERATIONS
            'format_date': { priority: 13, conflicts: [] },
            
            // GLOBAL LOCATION OPERATIONS
            'smart_format_postal_code': { priority: 14, conflicts: [] },
            
            // GLOBAL TEXT OPERATIONS
            'change_case': { priority: 15, conflicts: ['smart_case_conversion'] },
            'smart_case_conversion': { priority: 16, conflicts: ['change_case'] },
            'format_name_titlecase': { priority: 17, conflicts: [] },
            'format_sentence_case': { priority: 18, conflicts: [] },
            
            // GLOBAL VALIDATION OPERATIONS
            'validate_email': { priority: 19, conflicts: [] },
            'validate_phone': { priority: 20, conflicts: [] },
            'validate_url': { priority: 21, conflicts: [] },
            'validate_ip': { priority: 22, conflicts: [] },
            'validate_postal_code': { priority: 23, conflicts: [] },
            'handle_mismatched_types': { priority: 24, conflicts: [] },
            
            // GLOBAL ADVANCED TEXT OPERATIONS
            'find_and_replace': { priority: 25, conflicts: [] },
            'remove_html': { priority: 26, conflicts: [] },
            'convert_to_slug': { priority: 27, conflicts: [] },
            'extract_domain': { priority: 28, conflicts: [] },
            
            // GLOBAL DUPLICATE OPERATIONS (should be last)
            'remove_duplicates': { priority: 90, conflicts: ['fuzzy_remove_duplicates'] },
            'fuzzy_remove_duplicates': { priority: 91, conflicts: ['remove_duplicates'] },
            'find_similar_values': { priority: 92, conflicts: [] },
            'column_level_deduplication': { priority: 93, conflicts: [] },
            
            // STRUCTURAL OPERATIONS
            'remove_empty_rows': { priority: 94, conflicts: [] },
            'remove_columns': { priority: 95, conflicts: [] }
        };
    }

    validate(operations) {
        const errors = [];
        const warnings = [];
        const validOperations = [];
        
        operations.forEach((op, index) => {
            const opErrors = this.validateSingleOperation(op, index);
            
            if (opErrors.length === 0) {
                validOperations.push(op);
            } else {
                errors.push(`Operation ${index} (${op.type}): ${opErrors.join(', ')}`);
            }
        });

        // Check for conflicts between operations
        const conflictWarnings = this.detectOperationConflicts(validOperations);
        warnings.push(...conflictWarnings);

        return {
            valid: errors.length === 0,
            operations: validOperations,
            errors,
            warnings
        };
    }

    validateSingleOperation(operation, index) {
        const errors = [];
        
        if (!operation.type) {
            errors.push('Missing operation type');
            return errors;
        }
        
        // Basic validation - don't fail on unknown operation types
        if (!this.operationDependencies[operation.type]) {
            console.warn(`Unknown operation type: ${operation.type}`);
            // Don't treat this as an error - just warn
        }
        
        return errors;
    }

    detectOperationConflicts(operations) {
        const warnings = [];
        const appliedOperations = new Set();
        
        operations.forEach(op => {
            const opConfig = this.operationDependencies[op.type];
            if (!opConfig) return;
            
            // Check for conflicts with already applied operations
            opConfig.conflicts.forEach(conflictingOp => {
                if (appliedOperations.has(conflictingOp)) {
                    warnings.push(`Conflict: ${op.type} conflicts with ${conflictingOp}`);
                }
            });
            
            appliedOperations.add(op.type);
        });
        
        return warnings;
    }

    deduplicateOperations(operations) {
        const uniqueOperations = [];
        const seenOperations = new Set();
        
        operations.forEach(op => {
            const operationKey = this.getOperationKey(op);
            
            if (!seenOperations.has(operationKey)) {
                seenOperations.add(operationKey);
                uniqueOperations.push(op);
            }
        });
        
        return {
            operations: uniqueOperations,
            duplicatesRemoved: operations.length - uniqueOperations.length
        };
    }

    getOperationKey(operation) {
        // Create a unique key for operation deduplication
        return `${operation.type}:${JSON.stringify(operation.params || {})}`;
    }

    optimizeOperationGrouping(operations) {
        if (operations.length === 0) return operations;
        
        const optimized = [];
        const seenTypes = new Set();
        
        // Group similar operations and remove redundancies
        operations.forEach(op => {
            // Skip redundant trim operations
            if ((op.type === 'trim_whitespace' || op.type === 'trim_whitespace_all') && 
                seenTypes.has('trim_operation')) {
                console.log('Skipping redundant trim operation:', op.type);
                return;
            }
            
            if (op.type === 'trim_whitespace' || op.type === 'trim_whitespace_all') {
                seenTypes.add('trim_operation');
            }
            
            // Skip duplicate case operations
            if ((op.type === 'change_case' || op.type === 'smart_case_conversion') && 
                seenTypes.has('case_operation')) {
                console.log('Skipping duplicate case operation:', op.type);
                return;
            }
            
            if (op.type === 'change_case' || op.type === 'smart_case_conversion') {
                seenTypes.add('case_operation');
            }
            
            optimized.push(op);
        });
        
        return optimized;
    }

    preprocessOperations(operations) {
        if (!operations || operations.length === 0) {
            return {
                operations: [],
                validation: { valid: true, errors: [], warnings: [] },
                deduplication: { duplicatesRemoved: 0 },
                warnings: []
            };
        }

        try {
            // Step 1: Validate operations
            const validationResult = this.validate(operations);
            
            // Step 2: Remove duplicates
            const deduplicationResult = this.deduplicateOperations(validationResult.operations);
            
            // Step 3: Optimize grouping
            const optimizedOperations = this.optimizeOperationGrouping(deduplicationResult.operations);
            
            return {
                operations: optimizedOperations,
                validation: validationResult,
                deduplication: deduplicationResult,
                warnings: validationResult.warnings
            };
        } catch (error) {
            console.error('Operation preprocessing failed:', error);
            // Return original operations if preprocessing fails
            return {
                operations: operations,
                validation: { valid: true, errors: [], warnings: [] },
                deduplication: { duplicatesRemoved: 0 },
                warnings: ['Preprocessing failed - using original operations']
            };
        }
    }
}

export default OperationPreprocessor;