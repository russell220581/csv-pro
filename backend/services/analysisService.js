import { operations } from '@cleaning-engine/operations';
import { cleanHeaders } from '@cleaning-engine/helpers';

/**
 * Enhanced data analysis service for automatic cleaning
 */
class AnalysisService {
    
    /**
     * Analyze CSV data and detect cleaning opportunities
     */
    async analyzeData(data, headers, userPlan = 'free') {
        try {
            const analysisReport = [];
            const detectedOperations = [];
            
            // 1. Analyze each column for data patterns
            for (const header of headers) {
                const columnAnalysis = await this.analyzeColumn(data, header, userPlan);
                if (columnAnalysis) {
                    analysisReport.push(columnAnalysis);
                    
                    // Auto-add operations for critical issues
                    if (columnAnalysis.suggestions) {
                        columnAnalysis.suggestions.forEach(suggestion => {
                            if (suggestion.operation && suggestion.priority === 'high' && !suggestion.isPremium) {
                                detectedOperations.push(suggestion.operation);
                            }
                        });
                    }
                }
            }
            
            // 2. Analyze global dataset issues
            const globalAnalysis = await this.analyzeGlobalIssues(data, headers, userPlan);
            if (globalAnalysis) {
                analysisReport.push(globalAnalysis);
                
                // Auto-add global operations for critical issues
                if (globalAnalysis.suggestions) {
                    globalAnalysis.suggestions.forEach(suggestion => {
                        if (suggestion.operation && suggestion.priority === 'high') {
                            detectedOperations.push(suggestion.operation);
                        }
                    });
                }
            }
            
            return {
                analysisReport,
                detectedOperations,
                summary: {
                    totalIssues: analysisReport.length,
                    autoFixable: detectedOperations.length,
                    dataQualityScore: this.calculateQualityScore(analysisReport)
                }
            };
        } catch (error) {
            console.error('Analysis service error:', error);
            // Return empty analysis on error
            return {
                analysisReport: [],
                detectedOperations: [],
                summary: { totalIssues: 0, autoFixable: 0, dataQualityScore: 100 }
            };
        }
    }
    
    /**
     * Analyze individual column for data patterns
     */
    async analyzeColumn(data, header, userPlan) {
        const columnValues = data.map(row => row[header]).filter(val => val && val.toString().trim() !== '');
        if (columnValues.length === 0) return null;
        
        const analysis = {
            type: 'column',
            header,
            detectedType: this.detectColumnType(columnValues),
            stats: {
                totalRows: data.length,
                nonEmptyRows: columnValues.length,
                emptyRows: data.length - columnValues.length,
                uniqueCount: new Set(columnValues.map(v => v.toString().toLowerCase().trim())).size
            },
            suggestions: []
        };
        
        // Generate suggestions based on detected type
        const suggestions = this.generateColumnSuggestions(analysis, userPlan);
        if (suggestions.length > 0) {
            analysis.suggestions = suggestions;
        }
        
        return analysis;
    }
    
    /**
     * Detect column data type
     */
    detectColumnType(values) {
        const sample = values.slice(0, 100);
        
        // Email detection
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (sample.some(val => emailRegex.test(val.toString().trim()))) {
            return 'email';
        }
        
        // Phone detection
        const phoneRegex = /[\+]?[1-9][\d]{0,15}/;
        if (sample.some(val => phoneRegex.test(val.toString().replace(/[^\d+]/g, '')))) {
            return 'phone';
        }
        
        // Date detection
        const dateRegex = /(\d{1,4}[\/\-\.]\d{1,4}[\/\-\.]\d{1,4})|(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
        if (sample.some(val => dateRegex.test(val.toString()))) {
            return 'date';
        }
        
        return 'text';
    }
    
    /**
     * Generate cleaning suggestions for column
     */
    generateColumnSuggestions(analysis, userPlan) {
        const suggestions = [];
        
        // Always suggest trimming if whitespace detected
        const hasWhitespace = analysis.stats.nonEmptyRows > 0 && 
            analysis.stats.nonEmptyRows !== analysis.stats.uniqueCount;
        if (hasWhitespace) {
            suggestions.push({
                description: 'Remove leading/trailing whitespace',
                priority: 'high',
                operation: { type: 'trim_whitespace', params: { column: analysis.header } },
                isPremium: false
            });
        }
        
        // Type-specific suggestions
        switch (analysis.detectedType) {
            case 'email':
                suggestions.push({
                    description: 'Standardize email formatting',
                    priority: 'medium',
                    operation: { type: 'format_email', params: { column: analysis.header } },
                    isPremium: false
                });
                break;
                
            case 'phone':
                suggestions.push({
                    description: 'Standardize phone number formatting',
                    priority: 'medium', 
                    operation: { type: 'smart_format_phone', params: { column: analysis.header, fallbackCountry: 'US' } },
                    isPremium: false
                });
                break;
                
            case 'date':
                suggestions.push({
                    description: 'Standardize date formatting',
                    priority: 'medium',
                    operation: { type: 'format_date', params: { column: analysis.header, format: 'YYYY-MM-DD' } },
                    isPremium: false
                });
                break;
        }
        
        return suggestions;
    }
    
    /**
     * Analyze global dataset issues
     */
    async analyzeGlobalIssues(data, headers, userPlan) {
        const issues = [];
        
        // Check for duplicate rows
        const duplicateAnalysis = this.analyzeDuplicates(data, headers);
        if (duplicateAnalysis.hasDuplicates) {
            issues.push({
                description: `Found ${duplicateAnalysis.duplicateCount} duplicate rows`,
                priority: duplicateAnalysis.duplicateCount > data.length * 0.1 ? 'high' : 'medium',
                operation: { 
                    type: 'remove_duplicates', 
                    params: { columns: headers.slice(0, 3) }
                },
                isPremium: userPlan === 'premium'
            });
        }
        
        // Check for completely empty rows
        const emptyRowCount = data.filter(row => 
            headers.every(header => !row[header] || row[header].toString().trim() === '')
        ).length;
        
        if (emptyRowCount > 0) {
            issues.push({
                description: `Found ${emptyRowCount} completely empty rows`,
                priority: emptyRowCount > data.length * 0.05 ? 'high' : 'low',
                operation: { type: 'remove_empty_rows', params: {} },
                isPremium: false
            });
        }
        
        if (issues.length === 0) return null;
        
        return {
            type: 'global',
            description: 'Dataset-level issues found',
            suggestions: issues
        };
    }
    
    /**
     * Analyze for duplicate rows
     */
    analyzeDuplicates(data, headers) {
        const seen = new Set();
        const duplicates = [];
        
        data.forEach((row, index) => {
            const key = headers.map(h => row[h] || '').join('|').toLowerCase().trim();
            if (seen.has(key)) {
                duplicates.push(index);
            } else {
                seen.add(key);
            }
        });
        
        return {
            hasDuplicates: duplicates.length > 0,
            duplicateCount: duplicates.length,
            duplicateRows: duplicates
        };
    }
    
    /**
     * Calculate overall data quality score
     */
    calculateQualityScore(analysisReport) {
        if (analysisReport.length === 0) return 100;
        
        let issueScore = 0;
        analysisReport.forEach(report => {
            if (report.suggestions) {
                report.suggestions.forEach(suggestion => {
                    switch (suggestion.priority) {
                        case 'high': issueScore += 3; break;
                        case 'medium': issueScore += 2; break;
                        case 'low': issueScore += 1; break;
                    }
                });
            }
        });
        
        return Math.max(0, 100 - (issueScore * 5));
    }
}

export default new AnalysisService();