import { operations } from '@csvpro/cleaning-engine/operations';
import { 
  detectPhoneCountry, 
  detectPostalCodeCountry, 
  detectDateFormat,
  detectScript,
  detectCurrency,
  isValidPhoneNumber,
  formatPhoneNumber,
  formatDate,
  cleanHeaders,
  cleanNumber,
  formatCurrency
} from '@csvpro/cleaning-engine/utils/helpers';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import pkg from 'validator';
const { isEmail, isURL, isIP, isPostalCode } = pkg;

/**
 * Enhanced global data analysis service for automatic cleaning
 */
class AnalysisService {
    constructor(options = {}) {
        this.options = {
            enableSampling: true,
            sampleSize: 1000,
            strictValidation: false,
            maxAnalysisTime: 30000,
            enableGlobalDetection: true,
            ...options
        };
        
        // Cache for performance
        this._columnCache = new Map();
        this._globalCache = new Map();
    }
    
    /**
     * Analyze CSV data with global data pattern detection
     */
    async analyzeData(data, headers, userPlan = 'free') {
        try {
            const analysisStartTime = Date.now();
            const analysisReport = [];
            const detectedOperations = [];
            
            // Use sampled data for large datasets
            const analysisData = this.options.enableSampling ? 
                this.getAnalysisSample(data, this.options.sampleSize) : data;
            
            // 1. Analyze each column for global data patterns
            for (const header of headers) {
                // Check timeout
                if (Date.now() - analysisStartTime > this.options.maxAnalysisTime) {
                    console.warn('Analysis timeout reached, returning partial results');
                    break;
                }
                
                const columnAnalysis = await this.analyzeColumn(analysisData, header, userPlan);
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
                    dataQualityScore: this.calculateQualityScore(analysisReport),
                    analysisTime: Date.now() - analysisStartTime,
                    globalDataTypes: this.detectGlobalDataTypes(analysisReport)
                }
            };
        } catch (error) {
            console.error('Global analysis service error:', error);
            return {
                analysisReport: [],
                detectedOperations: [],
                summary: { 
                    totalIssues: 0, 
                    autoFixable: 0, 
                    dataQualityScore: 100,
                    analysisTime: 0,
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Analyze individual column with global data pattern detection
     */
    async analyzeColumn(data, header, userPlan, headerName = '') {
        const cacheKey = `${header}_${userPlan}_${data.length}_${this.options.enableGlobalDetection}`;
        if (this._columnCache.has(cacheKey)) {
            return this._columnCache.get(cacheKey);
        }
        
        const columnValues = data.map(row => row[header]).filter(val => val && val.toString().trim() !== '');
        if (columnValues.length === 0) {
            const emptyAnalysis = {
                type: 'column',
                header,
                detectedType: 'empty',
                stats: {
                    totalRows: data.length,
                    nonEmptyRows: 0,
                    emptyRows: data.length,
                    uniqueCount: 0
                },
                suggestions: [{
                    description: 'Column is completely empty',
                    priority: 'low',
                    operation: null,
                    isPremium: false
                }]
            };
            this._columnCache.set(cacheKey, emptyAnalysis);
            return emptyAnalysis;
        }
        
        const analysis = {
            type: 'column',
            header,
            detectedType: this.detectColumnType(columnValues, header),
            stats: {
                totalRows: data.length,
                nonEmptyRows: columnValues.length,
                emptyRows: data.length - columnValues.length,
                uniqueCount: new Set(columnValues.map(v => v.toString().toLowerCase().trim())).size,
                sampleValues: columnValues.slice(0, 5),
                dataDistribution: this.analyzeDataDistribution(columnValues, header)
            },
            suggestions: []
        };
        
        // Generate global-aware suggestions
        const suggestions = this.generateGlobalSuggestions(analysis, columnValues, userPlan);
        if (suggestions.length > 0) {
            analysis.suggestions = suggestions;
        }
        
        this._columnCache.set(cacheKey, analysis);
        return analysis;
    }
    
    /**
     * Detect column data type with enhanced global detection
     */
    detectColumnType(values, headerName = '') {
        if (!this.options.enableGlobalDetection) {
            return this.basicTypeDetection(values, headerName);
        }
        
        return this.advancedGlobalTypeDetection(values, headerName);
    }
    
    /**
     * Basic type detection for fallback
     */
    basicTypeDetection(values, headerName) {
        const sample = values.slice(0, 100);
        const headerLower = headerName.toLowerCase();
        
        // Header-based detection
        if (headerLower.includes('email')) return 'email';
        if (headerLower.includes('phone') || headerLower.includes('mobile')) return 'phone';
        if (headerLower.includes('date') || headerLower.includes('time')) return 'date';
        if (headerLower.includes('name')) return 'name';
        if (headerLower.includes('url') || headerLower.includes('website')) return 'url';
        if (headerLower.includes('ip')) return 'ip';
        if (headerLower.includes('zip') || headerLower.includes('postal')) return 'postal_code';
        if ((headerLower.includes('total') || headerLower.includes('price') || 
             headerLower.includes('amount')) && !headerLower.includes('name')) return 'money';
        
        return 'text';
    }
    
    /**
     * Advanced global type detection
     */
    advancedGlobalTypeDetection(values, headerName) {
        const sample = values.slice(0, 100);
        const headerLower = headerName.toLowerCase();
        
        // Global email detection
        const emailCount = sample.filter(val => isEmail(String(val).trim())).length;
        if (emailCount > sample.length * 0.3) return 'email';
        
        // Global phone detection
        const phoneCount = sample.filter(val => {
            try {
                const country = detectPhoneCountry(String(val));
                const phoneNumber = parsePhoneNumberFromString(String(val), country);
                return phoneNumber ? phoneNumber.isValid() : false;
            } catch {
                return false;
            }
        }).length;
        if (phoneCount > sample.length * 0.3) return 'phone';
        
        // Global date detection
        const dateCount = sample.filter(val => detectDateFormat(String(val)) !== null).length;
        if (dateCount > sample.length * 0.3) return 'date';
        
        // Global URL detection
        const urlCount = sample.filter(val => isURL(String(val).trim())).length;
        if (urlCount > sample.length * 0.3) return 'url';
        
        // Global IP detection
        const ipCount = sample.filter(val => isIP(String(val).trim())).length;
        if (ipCount > sample.length * 0.3) return 'ip';
        
        // Global postal code detection
        const postalCount = sample.filter(val => {
            const country = detectPostalCodeCountry(String(val));
            return isPostalCode(String(val), country);
        }).length;
        if (postalCount > sample.length * 0.3) return 'postal_code';
        
        // Number detection with global currency support
        const numberCount = sample.filter(val => {
            const num = cleanNumber(val);
            return num !== null && !isNaN(num);
        }).length;
        if (numberCount > sample.length * 0.8) return 'number';
        
        // Currency detection
        const currencyCount = sample.filter(val => {
            const str = String(val);
            return /[\$\€\£\¥\₹\₩\₽]/.test(str) || detectCurrency(str) !== 'USD';
        }).length;
        if (currencyCount > sample.length * 0.3 && headerLower.includes('price')) return 'money';
        
        // Boolean detection with international support
        const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n', 'oui', 'non', 'ja', 'nein', '是', '否'];
        const booleanCount = sample.filter(val => 
            booleanValues.includes(String(val).toLowerCase().trim())
        ).length;
        if (booleanCount > sample.length * 0.8) return 'boolean';
        
        // Script detection for international text
        const script = this.detectColumnScript(sample);
        if (script !== 'latin') {
            return `text_${script}`;
        }
        
        return 'text';
    }
    
    /**
     * Detect dominant script in column
     */
    detectColumnScript(sample) {
        const scripts = sample.map(val => detectScript(String(val)));
        const scriptCount = {};
        
        scripts.forEach(script => {
            scriptCount[script] = (scriptCount[script] || 0) + 1;
        });
        
        let dominantScript = 'latin';
        let maxCount = 0;
        
        for (const [script, count] of Object.entries(scriptCount)) {
            if (count > maxCount) {
                maxCount = count;
                dominantScript = script;
            }
        }
        
        return dominantScript;
    }
    
    /**
     * Analyze data distribution for quality assessment
     */
    analyzeDataDistribution(values, header) {
        const nonEmptyValues = values.filter(val => val && String(val).trim() !== '');
        if (nonEmptyValues.length === 0) return {};
        
        const distribution = {
            total: nonEmptyValues.length,
            unique: new Set(nonEmptyValues.map(v => String(v).toLowerCase().trim())).size,
            emptyPercentage: ((values.length - nonEmptyValues.length) / values.length) * 100
        };
        
        // Format consistency analysis
        const formats = {};
        nonEmptyValues.forEach(val => {
            const strVal = String(val).trim();
            const format = this.detectValueFormat(strVal, header);
            formats[format] = (formats[format] || 0) + 1;
        });
        
        distribution.formatConsistency = Object.values(formats)[0] / nonEmptyValues.length;
        distribution.dominantFormat = Object.keys(formats).reduce((a, b) => formats[a] > formats[b] ? a : b);
        
        return distribution;
    }
    
    /**
     * Detect format of individual value
     */
    detectValueFormat(value, header) {
        if (isEmail(value)) return 'email';
        if (isURL(value)) return 'url';
        if (isIP(value)) return 'ip';
        
        try {
            const country = detectPhoneCountry(value);
            const phoneNumber = parsePhoneNumberFromString(value, country);
            if (phoneNumber && phoneNumber.isValid()) return 'phone';
        } catch {}
        
        if (detectDateFormat(value)) return 'date';
        
        const postalCountry = detectPostalCodeCountry(value);
        if (isPostalCode(value, postalCountry)) return 'postal_code';
        
        if (!isNaN(cleanNumber(value))) return 'number';
        
        return 'text';
    }
    
    /**
     * Generate cleaning suggestions with global awareness
     */
    generateGlobalSuggestions(analysis, columnValues, userPlan) {
        const suggestions = [];
        const alreadySuggested = new Set();
        
        // Always suggest trimming if whitespace detected
        const hasWhitespace = analysis.stats.nonEmptyRows > 0 && 
            analysis.stats.dataDistribution.formatConsistency < 0.9;
        if (hasWhitespace && !alreadySuggested.has('trim')) {
            suggestions.push({
                description: 'Remove leading/trailing whitespace',
                priority: 'high',
                operation: { type: 'trim_whitespace', params: { column: analysis.header } },
                isPremium: false
            });
            alreadySuggested.add('trim');
        }
        
        // Type-specific global suggestions
        switch (analysis.detectedType) {
            case 'email':
                if (!alreadySuggested.has('format')) {
                    const invalidCount = columnValues.filter(val => !isEmail(String(val).trim())).length;
                    if (invalidCount > 0) {
                        suggestions.push({
                            description: `Format ${invalidCount} email addresses`,
                            priority: 'high',
                            operation: { type: 'format_email', params: { column: analysis.header } },
                            isPremium: false
                        });
                        alreadySuggested.add('format');
                    }
                }
                break;
                
            case 'phone':
                if (!alreadySuggested.has('format')) {
                    const unformattedCount = this.countUnformattedPhones(columnValues);
                    if (unformattedCount > 0) {
                        suggestions.push({
                            description: `Standardize ${unformattedCount} phone numbers globally`,
                            priority: 'high',
                            operation: { type: 'smart_format_phone', params: { column: analysis.header, fallbackCountry: 'US' } },
                            isPremium: false
                        });
                        alreadySuggested.add('format');
                    }
                }
                break;
                
            case 'date':
                if (!alreadySuggested.has('format')) {
                    const inconsistentCount = this.countInconsistentDates(columnValues);
                    if (inconsistentCount > 0) {
                        suggestions.push({
                            description: `Standardize ${inconsistentCount} date formats`,
                            priority: 'medium',
                            operation: { type: 'format_date', params: { column: analysis.header, format: 'YYYY-MM-DD' } },
                            isPremium: false
                        });
                        alreadySuggested.add('format');
                    }
                }
                break;
                
            case 'money':
                if (!alreadySuggested.has('currency') && userPlan === 'premium') {
                    suggestions.push({
                        description: 'Standardize currency formatting',
                        priority: 'medium',
                        operation: { type: 'format_currency', params: { column: analysis.header, currency: 'USD' } },
                        isPremium: true
                    });
                    alreadySuggested.add('currency');
                }
                break;
                
            case 'postal_code':
                if (!alreadySuggested.has('postal')) {
                    const unformattedCount = this.countUnformattedPostalCodes(columnValues);
                    if (unformattedCount > 0) {
                        suggestions.push({
                            description: `Format ${unformattedCount} postal codes globally`,
                            priority: 'medium',
                            operation: { type: 'smart_format_postal_code', params: { column: analysis.header, fallbackCountry: 'US' } },
                            isPremium: false
                        });
                        alreadySuggested.add('postal');
                    }
                }
                break;
        }
        
        // Text normalization for international text
        if (analysis.detectedType.startsWith('text_') && !alreadySuggested.has('case')) {
            const needsNormalization = this.needsTextNormalization(columnValues, analysis.detectedType);
            if (needsNormalization) {
                suggestions.push({
                    description: 'Normalize text formatting',
                    priority: 'medium',
                    operation: { type: 'smart_case_conversion', params: { column: analysis.header } },
                    isPremium: userPlan === 'premium'
                });
                alreadySuggested.add('case');
            }
        }
        
        // Validation suggestions for data quality
        const invalidCount = this.validateDataFormat(columnValues, analysis.detectedType);
        if (invalidCount > 0 && !alreadySuggested.has('validate')) {
            const invalidPercentage = (invalidCount / analysis.stats.nonEmptyRows) * 100;
            suggestions.push({
                description: `Found ${invalidCount} invalid ${analysis.detectedType} values (${invalidPercentage.toFixed(1)}%)`,
                priority: invalidPercentage > 10 ? 'high' : 'medium',
                operation: { type: `validate_${analysis.detectedType}`, params: { column: analysis.header } },
                isPremium: userPlan === 'premium'
            });
            alreadySuggested.add('validate');
        }
        
        return suggestions;
    }
    
    /**
     * Count unformatted phone numbers
     */
    countUnformattedPhones(values) {
        return values.filter(val => {
            try {
                const country = detectPhoneCountry(String(val));
                const phoneNumber = parsePhoneNumberFromString(String(val), country);
                if (!phoneNumber || !phoneNumber.isValid()) return true;
                
                // Consider formatted if it matches standard patterns
                const formatted = phoneNumber.formatInternational();
                return formatted === String(val).trim();
            } catch {
                return true;
            }
        }).length;
    }
    
    /**
     * Count inconsistent dates
     */
    countInconsistentDates(values) {
        const formats = new Set();
        values.forEach(val => {
            const format = detectDateFormat(String(val));
            if (format) formats.add(format);
        });
        return formats.size > 1 ? values.length : 0;
    }
    
    /**
     * Count unformatted postal codes
     */
    countUnformattedPostalCodes(values) {
        return values.filter(val => {
            const country = detectPostalCodeCountry(String(val));
            const code = String(val).toUpperCase().trim();
            return !isPostalCode(code, country);
        }).length;
    }
    
    /**
     * Check if text needs normalization
     */
    needsTextNormalization(values, detectedType) {
        const script = detectedType.replace('text_', '');
        if (script !== 'latin') return false;
        
        return values.some(val => {
            const str = String(val).trim();
            return str !== str.toLowerCase() && str !== str.toUpperCase();
        });
    }
    
    /**
     * Validate specific data formats globally
     */
    validateDataFormat(values, type) {
        const nonEmptyValues = values.filter(val => val && String(val).trim() !== '');
        
        switch (type) {
            case 'email':
                return nonEmptyValues.filter(val => !isEmail(String(val).trim())).length;
                
            case 'phone':
                return nonEmptyValues.filter(val => {
                    try {
                        const country = detectPhoneCountry(String(val));
                        const phoneNumber = parsePhoneNumberFromString(String(val), country);
                        return !phoneNumber || !phoneNumber.isValid();
                    } catch {
                        return true;
                    }
                }).length;
                
            case 'url':
                return nonEmptyValues.filter(val => !isURL(String(val).trim())).length;
                
            case 'ip':
                return nonEmptyValues.filter(val => !isIP(String(val).trim())).length;
                
            case 'postal_code':
                return nonEmptyValues.filter(val => {
                    const country = detectPostalCodeCountry(String(val));
                    return !isPostalCode(String(val), country);
                }).length;
                
            default:
                return 0;
        }
    }
    
    /**
     * Analyze global dataset issues
     */
    async analyzeGlobalIssues(data, headers, userPlan) {
        const cacheKey = `global_${headers.join('_')}_${data.length}_${userPlan}`;
        if (this._globalCache.has(cacheKey)) {
            return this._globalCache.get(cacheKey);
        }
        
        const issues = [];
        
        // Check for duplicate rows
        const duplicateAnalysis = this.analyzeDuplicates(data, headers);
        if (duplicateAnalysis.hasDuplicates) {
            const duplicatePercentage = (duplicateAnalysis.duplicateCount / data.length) * 100;
            issues.push({
                description: `Found ${duplicateAnalysis.duplicateCount} duplicate rows (${duplicatePercentage.toFixed(1)}%)`,
                priority: duplicatePercentage > 10 ? 'high' : 'medium',
                operation: { 
                    type: 'remove_duplicates', 
                    params: { columns: headers.slice(0, Math.min(3, headers.length)) }
                },
                isPremium: userPlan === 'premium'
            });
        }
        
        // Check for completely empty rows
        const emptyRowCount = data.filter(row => 
            headers.every(header => !row[header] || row[header].toString().trim() === '')
        ).length;
        
        if (emptyRowCount > 0) {
            const emptyPercentage = (emptyRowCount / data.length) * 100;
            issues.push({
                description: `Found ${emptyRowCount} completely empty rows (${emptyPercentage.toFixed(1)}%)`,
                priority: emptyPercentage > 5 ? 'high' : 'low',
                operation: { type: 'remove_empty_rows', params: {} },
                isPremium: false
            });
        }
        
        // Check for inconsistent column lengths
        const rowLengths = data.map(row => Object.keys(row).length);
        const uniqueLengths = new Set(rowLengths);
        if (uniqueLengths.size > 1) {
            issues.push({
                description: 'Inconsistent number of columns across rows',
                priority: 'medium',
                operation: { type: 'standardize_columns', params: {} },
                isPremium: userPlan === 'premium'
            });
        }
        
        // Check for international data inconsistencies
        const internationalIssues = this.analyzeInternationalIssues(data, headers);
        issues.push(...internationalIssues);
        
        if (issues.length === 0) {
            this._globalCache.set(cacheKey, null);
            return null;
        }
        
        const globalAnalysis = {
            type: 'global',
            description: 'Dataset-level issues found',
            suggestions: issues
        };
        
        this._globalCache.set(cacheKey, globalAnalysis);
        return globalAnalysis;
    }
    
    /**
     * Analyze international data issues
     */
    analyzeInternationalIssues(data, headers) {
        const issues = [];
        
        // Check for mixed country codes in phone numbers
        const phoneColumns = headers.filter(h => 
            h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile')
        );
        
        phoneColumns.forEach(column => {
            const countries = new Set();
            data.forEach(row => {
                if (row[column]) {
                    const country = detectPhoneCountry(String(row[column]));
                    countries.add(country);
                }
            });
            
            if (countries.size > 1) {
                issues.push({
                    description: `Mixed country codes found in ${column} (${Array.from(countries).join(', ')})`,
                    priority: 'low',
                    operation: { type: 'smart_format_phone', params: { column, fallbackCountry: 'US' } },
                    isPremium: false
                });
            }
        });
        
        return issues;
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
     * Detect global data types in the dataset
     */
    detectGlobalDataTypes(analysisReport) {
        const types = new Set();
        analysisReport.forEach(report => {
            if (report.detectedType) {
                types.add(report.detectedType);
            }
        });
        return Array.from(types);
    }
    
    /**
     * Calculate overall data quality score
     */
    calculateQualityScore(analysisReport) {
        if (analysisReport.length === 0) return 100;
        
        let maxPossibleScore = 0;
        let actualScore = 100;
        
        analysisReport.forEach(report => {
            if (report.suggestions) {
                report.suggestions.forEach(suggestion => {
                    let weight = 0;
                    switch (suggestion.priority) {
                        case 'high': weight = 10; break;
                        case 'medium': weight = 5; break;
                        case 'low': weight = 2; break;
                    }
                    maxPossibleScore += weight;
                    
                    // Deduct based on issue severity and data impact
                    if (report.stats && report.stats.nonEmptyRows > 0) {
                        const issueRatio = 1 - (report.stats.dataDistribution?.formatConsistency || 1);
                        actualScore -= weight * Math.min(1, issueRatio * 2);
                    }
                });
            }
        });
        
        return Math.max(0, Math.min(100, Math.round(actualScore)));
    }
    
    /**
     * Sample data for large datasets
     */
    getAnalysisSample(data, sampleSize = 1000) {
        if (data.length <= sampleSize) return data;
        
        const sample = [];
        const step = Math.floor(data.length / sampleSize);
        for (let i = 0; i < data.length && sample.length < sampleSize; i += step) {
            sample.push(data[i]);
        }
        
        while (sample.length < sampleSize && sample.length < data.length) {
            const randomIndex = Math.floor(Math.random() * data.length);
            if (!sample.includes(data[randomIndex])) {
                sample.push(data[randomIndex]);
            }
        }
        
        return sample;
    }
    
    /**
     * Clear analysis cache
     */
    clearAnalysisCache() {
        this._columnCache.clear();
        this._globalCache.clear();
    }
    
    /**
     * Get service statistics and capabilities
     */
    getServiceInfo() {
        return {
            version: '3.0.0',
            features: [
                'global_type_detection',
                'international_validation', 
                'quality_scoring',
                'smart_sampling',
                'script_detection',
                'global_format_detection'
            ],
            maxSampleSize: this.options.sampleSize,
            supportedTypes: [
                'email', 'phone', 'date', 'name', 'url', 'ip', 
                'postal_code', 'money', 'number', 'boolean', 'text'
            ],
            globalDetection: this.options.enableGlobalDetection
        };
    }
}

export default new AnalysisService({ enableGlobalDetection: true });