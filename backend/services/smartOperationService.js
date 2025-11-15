import { operations as availableOperations } from '@csvpro/cleaning-engine/operations';
import { optimizeOperationSequence } from '@csvpro/cleaning-engine/utils/operationSequencer';
import OperationPreprocessor from '@csvpro/cleaning-engine/operationPreprocessor';

/**
 * Enhanced SmartOperationService with global operation optimization
 */
class SmartOperationService {
    
    /**
     * Generate smart operations from analysis results with global awareness
     */
    generateSmartOperations(analysisResults, userPlan = 'free') {
        const smartOperations = [];
        const usedColumns = new Set();
        
        // Process all suggestions and track used columns
        analysisResults.analysisReport.forEach(report => {
            if (report.suggestions) {
                report.suggestions.forEach(suggestion => {
                    if (this.shouldAutoApply(suggestion, userPlan)) {
                        // Prevent duplicate operations for same column
                        const column = suggestion.operation.params?.column;
                        if (!column || !usedColumns.has(column)) {
                            smartOperations.push(suggestion.operation);
                            if (column) usedColumns.add(column);
                        }
                    }
                });
            }
        });
        
        // Add global optimization operations
        const globalOps = this.generateGlobalOptimizationOperations(analysisResults, userPlan, usedColumns);
        smartOperations.push(...globalOps);
        
        return this.optimizeOperations(smartOperations);
    }
    
    /**
     * Generate global optimization operations
     */
    generateGlobalOptimizationOperations(analysisResults, userPlan, usedColumns) {
        const globalOps = [];
        
        // Add header standardization if not already applied
        if (!usedColumns.has('header_ops')) {
            globalOps.push({
                type: 'standardize_headers',
                params: {},
                isSmart: true,
                autoApplied: true
            });
            usedColumns.add('header_ops');
        }
        
        // Add global whitespace trimming
        if (!usedColumns.has('trim_ops')) {
            globalOps.push({
                type: 'trim_whitespace_all',
                params: {},
                isSmart: true,
                autoApplied: true
            });
            usedColumns.add('trim_ops');
        }
        
        // Add empty row removal if significant empty rows detected
        const emptyRowStats = this.analyzeEmptyRows(analysisResults);
        if (emptyRowStats.percentage > 5 && !usedColumns.has('empty_rows')) {
            globalOps.push({
                type: 'remove_empty_rows',
                params: {},
                isSmart: true,
                autoApplied: true
            });
            usedColumns.add('empty_rows');
        }
        
        return globalOps;
    }
    
    /**
     * Analyze empty row statistics
     */
    analyzeEmptyRows(analysisResults) {
        let totalEmpty = 0;
        let totalRows = 0;
        
        analysisResults.analysisReport.forEach(report => {
            if (report.stats) {
                totalEmpty += report.stats.emptyRows;
                totalRows += report.stats.totalRows;
            }
        });
        
        return {
            totalEmpty,
            totalRows,
            percentage: totalRows > 0 ? (totalEmpty / totalRows) * 100 : 0
        };
    }
    
    /**
     * Enhanced operation optimization with global preprocessing
     */
    optimizeOperations(operations) {
        if (operations.length === 0) return [];
        
        try {
            // Use the enhanced preprocessor for global optimization
            const preprocessor = new OperationPreprocessor();
            const preprocessed = preprocessor.preprocessOperations(operations);
            
            console.log('Global operation preprocessing completed:', {
                original: operations.length,
                validated: preprocessed.operations.length,
                duplicatesRemoved: preprocessed.deduplication.duplicatesRemoved,
                warnings: preprocessed.warnings
            });
            
            return preprocessed.operations;
            
        } catch (error) {
            console.warn('Global operation preprocessing failed, using legacy optimization:', error);
            return this.legacyOptimizeOperations(operations);
        }
    }
    
    /**
     * Legacy optimization (maintained for backward compatibility)
     */
    legacyOptimizeOperations(operations) {
        if (operations.length === 0) return [];
        
        // Remove duplicate operations (same type and parameters)
        const uniqueOperations = [];
        const seenOperations = new Set();
        
        operations.forEach(op => {
            const operationKey = `${op.type}:${JSON.stringify(op.params)}`;
            if (!seenOperations.has(operationKey)) {
                seenOperations.add(operationKey);
                uniqueOperations.push(op);
            }
        });
        
        // Optimize execution order using existing sequencer
        return optimizeOperationSequence(uniqueOperations);
    }
    
    /**
     * Determine if a suggestion should be auto-applied
     */
    shouldAutoApply(suggestion, userPlan) {
        // Always apply high-priority, free operations
        if (suggestion.priority === 'high' && !suggestion.isPremium) {
            return true;
        }
        
        // Apply medium-priority if user is premium
        if (suggestion.priority === 'medium' && (!suggestion.isPremium || userPlan === 'premium')) {
            return true;
        }
        
        // Apply global optimization operations
        if (suggestion.operation?.type === 'standardize_headers' || 
            suggestion.operation?.type === 'trim_whitespace_all') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Generate operation summary for user reporting
     */
    generateOperationSummary(smartOperations, analysisResults) {
        return {
            totalAutoApplied: smartOperations.length,
            qualityImprovement: analysisResults.summary.dataQualityScore,
            operationsByType: this.groupOperationsByType(smartOperations),
            estimatedImpact: this.estimateCleaningImpact(analysisResults),
            globalDataTypes: analysisResults.summary.globalDataTypes || []
        };
    }
    
    /**
     * Group operations by type for reporting
     */
    groupOperationsByType(operations) {
        const groups = {};
        
        operations.forEach(op => {
            if (!groups[op.type]) {
                groups[op.type] = 0;
            }
            groups[op.type]++;
        });
        
        return groups;
    }
    
    /**
     * Estimate the impact of cleaning operations
     */
    estimateCleaningImpact(analysisResults) {
        const impact = {
            rowsCleaned: analysisResults.summary.totalIssues,
            dataQualityImprovement: 100 - analysisResults.summary.dataQualityScore,
            issuesResolved: analysisResults.summary.autoFixable
        };
        
        return impact;
    }
}

export default new SmartOperationService();