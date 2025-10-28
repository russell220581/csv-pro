import { operations as availableOperations } from '@cleaning-engine/operations';
import { optimizeOperationSequence } from '@cleaning-engine/operationSequencer';

/**
 * Converts analysis findings into intelligent cleaning operations
 */
class SmartOperationService {
    
    /**
     * Generate smart operations from analysis results
     */
    generateSmartOperations(analysisResults, userPlan = 'free') {
        const smartOperations = [];
        
        // 1. Process column-specific findings
        analysisResults.analysisReport.forEach(report => {
            if (report.type === 'column' && report.suggestions) {
                report.suggestions.forEach(suggestion => {
                    if (this.shouldAutoApply(suggestion, userPlan)) {
                        smartOperations.push(suggestion.operation);
                    }
                });
            }
        });
        
        // 2. Process global findings
        analysisResults.analysisReport.forEach(report => {
            if (report.type === 'global' && report.suggestions) {
                report.suggestions.forEach(suggestion => {
                    if (this.shouldAutoApply(suggestion, userPlan)) {
                        smartOperations.push(suggestion.operation);
                    }
                });
            }
        });
        
        // 3. Add data-driven operations based on patterns
        const patternOperations = this.generatePatternBasedOperations(analysisResults, userPlan);
        smartOperations.push(...patternOperations);
        
        // 4. Optimize operation sequence and remove duplicates
        return this.optimizeOperations(smartOperations);
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
        
        return false;
    }
    
    /**
     * Generate operations based on data patterns and statistics
     */
    generatePatternBasedOperations(analysisResults, userPlan) {
        const patternOperations = [];
        
        // Analyze data patterns across all columns
        const columnStats = this.analyzeColumnStatistics(analysisResults.analysisReport);
        
        // Auto-format based on data consistency
        columnStats.forEach(stat => {
            if (stat.consistencyScore > 0.8 && this.isFormattingOperationAvailable(stat.detectedType, userPlan)) {
                const operation = this.createFormattingOperation(stat.column, stat.detectedType);
                if (operation) {
                    patternOperations.push(operation);
                }
            }
        });
        
        return patternOperations;
    }
    
    /**
     * Analyze column statistics for pattern detection
     */
    analyzeColumnStatistics(analysisReport) {
        const stats = [];
        
        analysisReport.forEach(report => {
            if (report.type === 'column') {
                const consistencyScore = this.calculateConsistencyScore(report);
                stats.push({
                    column: report.header,
                    detectedType: report.detectedType,
                    consistencyScore,
                    sampleSize: report.stats.nonEmptyRows
                });
            }
        });
        
        return stats;
    }
    
    /**
     * Calculate how consistent the data is within a column
     */
    calculateConsistencyScore(columnReport) {
        const { nonEmptyRows, uniqueCount } = columnReport.stats;
        
        if (nonEmptyRows === 0) return 0;
        
        // High uniqueness suggests inconsistent formatting
        const uniquenessRatio = uniqueCount / nonEmptyRows;
        
        // Low uniqueness = high consistency (good candidate for auto-formatting)
        return Math.max(0, 1 - uniquenessRatio);
    }
    
    /**
     * Check if formatting operation is available for user plan
     */
    isFormattingOperationAvailable(detectedType, userPlan) {
        const operationMap = {
            'email': 'format_email',
            'phone': 'smart_format_phone', 
            'date': 'format_date'
        };
        
        const operationType = operationMap[detectedType];
        if (!operationType) return false;
        
        const operation = availableOperations[operationType];
        if (!operation) return false;
        
        // Check if operation is available for user's plan
        return !operation.isPremium || userPlan === 'premium';
    }
    
    /**
     * Create appropriate formatting operation based on data type
     */
    createFormattingOperation(column, detectedType) {
        const operationConfigs = {
            'email': {
                type: 'format_email',
                params: { column }
            },
            'phone': {
                type: 'smart_format_phone', 
                params: { column, fallbackCountry: 'US' }
            },
            'date': {
                type: 'format_date',
                params: { column, format: 'YYYY-MM-DD' }
            }
        };
        
        return operationConfigs[detectedType] || null;
    }
    
    /**
     * Optimize and deduplicate operations
     */
    optimizeOperations(operations) {
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
        
        // Optimize execution order
        return optimizeOperationSequence(uniqueOperations);
    }
    
    /**
     * Generate operation summary for user reporting
     */
    generateOperationSummary(smartOperations, analysisResults) {
        return {
            totalAutoApplied: smartOperations.length,
            qualityImprovement: analysisResults.summary.dataQualityScore,
            operationsByType: this.groupOperationsByType(smartOperations),
            estimatedImpact: this.estimateCleaningImpact(analysisResults)
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