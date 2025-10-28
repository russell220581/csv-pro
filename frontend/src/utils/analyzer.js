import { z } from 'zod';
import { isPossiblePhoneNumber } from 'libphonenumber-js/min';
import { 
  formatPostalCode, 
  isValidPhoneNumber, 
  detectCountry,
  findSimilarRows,
  findSimilarValues 
} from '@cleaning-engine/browser.js';

// Enhanced detection schemas with better pattern matching
const detectionSchemas = {
    email: z.string().email(),
    url: z.string().url(),
    number: z.string().regex(/^\s*[-+]?(\$?\d{1,3}(,\d{3})*|\d+)(\.\d+)?\s*$/),
    date: z.coerce.date().refine(d => !isNaN(d.getTime()), { message: "Invalid date" }),
    phone: z.string().refine(val => isPossiblePhoneNumber(String(val)), {
        message: "Not a possible phone number",
    }),
    postal_code: z.string().refine(val => {
        const code = String(val).trim();
        return code.length >= 3 && code.length <= 10; // Basic length check
    }),
};

// Enhanced keyword-based scoring for headers
const headerKeywords = {
    email: ['email', 'e-mail', 'contact_email'],
    phone: ['phone', 'mobile', 'contact_no', 'telephone', 'cell'],
    date: ['date', 'day', 'time', 'created_at', 'updated_at', 'timestamp'],
    name: ['name', 'contact', 'person', 'customer'],
    url: ['url', 'website', 'link', 'domain'],
    zipCode: ['zip', 'postal', 'postcode', 'zip_code'],
    address: ['address', 'street', 'city', 'state', 'location'],
};

/**
 * Enhanced smart analysis engine with auto-suggestion generation
 */
export const analyzeData = (data, headers) => {
    if (!data || data.length === 0) return [];

    const unifiedReport = [];
    const columnStats = {};

    // --- Per-Column Analysis ---
    headers.forEach(header => {
        const reportItem = {
            type: 'column',
            header: header,
            detectedType: 'text',
            confidence: 1,
            issues: [],
            suggestions: [],
            stats: {
                totalRows: 0,
                emptyCount: 0,
                uniqueCount: 0,
                mismatchCount: 0
            }
        };

        const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && String(val).trim() !== '');
        
        if (values.length === 0) {
            reportItem.suggestions.push({
                id: `empty_${header}`,
                description: `Column "${header}" is completely empty`,
                operation: { type: 'remove_columns', params: { columns: [header] } },
                isPremium: false,
                priority: 'low'
            });
            unifiedReport.push(reportItem);
            return;
        }

        reportItem.stats.totalRows = values.length;
        reportItem.stats.emptyCount = data.length - values.length;
        reportItem.stats.uniqueCount = new Set(values.map(v => String(v).toLowerCase())).size;

        // --- Enhanced Data Type Detection ---
        const scores = {};
        const lowerHeader = header.toLowerCase();
        
        // Header-based scoring
        for (const type in headerKeywords) {
            if (headerKeywords[type].some(keyword => lowerHeader.includes(keyword))) {
                scores[type] = (scores[type] || 0) + 40;
            }
        }
        
        // Content-based scoring
        let bestMatch = { type: 'text', score: 0 };
        for (const type in detectionSchemas) {
            const passCount = values.reduce((acc, val) => {
                try {
                    return detectionSchemas[type].safeParse(val).success ? acc + 1 : acc;
                } catch {
                    return acc;
                }
            }, 0);
            const contentScore = (passCount / values.length) * 100;
            scores[type] = (scores[type] || 0) + contentScore;
            if (scores[type] > bestMatch.score) {
                bestMatch = { type, score: scores[type] };
            }
            
            // Track mismatches for suggestions
            if (contentScore > 20 && contentScore < 80) {
                reportItem.stats.mismatchCount = values.length - passCount;
            }
        }

        reportItem.detectedType = bestMatch.score > 50 ? bestMatch.type : 'text';
        const passCount = values.reduce((acc, val) => {
            try {
                return detectionSchemas[reportItem.detectedType]?.safeParse(val).success ? acc + 1 : acc;
            } catch {
                return acc;
            }
        }, 0);
        reportItem.confidence = (passCount / values.length);

        // --- Generate Smart Suggestions ---
        generateColumnSuggestions(reportItem, values, headers);
        
        unifiedReport.push(reportItem);
        columnStats[header] = reportItem.stats;
    });

    // --- Enhanced Duplicate Analysis ---
    const duplicateReport = analyzeDuplicates(data, headers);
    unifiedReport.unshift(...duplicateReport);

    // --- Global, File-Wide Analysis ---
    generateGlobalSuggestions(unifiedReport, data, headers, columnStats);

    return unifiedReport;
};

/**
 * Generate smart suggestions for individual columns
 */
const generateColumnSuggestions = (reportItem, values, headers) => {
    const { header, detectedType, stats } = reportItem;

    // Data type mismatch suggestions
    if (stats.mismatchCount > 0 && detectedType !== 'text') {
        reportItem.suggestions.push({
            id: `mismatch_${header}`,
            description: `${Math.round(reportItem.confidence * 100)}% ${detectedType}s, but ${stats.mismatchCount} mismatched values found`,
            operation: { 
                type: 'handle_mismatched_types', 
                params: { 
                    column: header, 
                    expectedType: detectedType, 
                    action: 'clear_cell' 
                } 
            },
            isPremium: true,
            priority: 'high'
        });
    }

    // Text formatting issues
    if (detectedType === 'text') {
        // Check for leading/trailing whitespace
        const hasWhitespace = values.some(val => String(val).trim() !== String(val));
        if (hasWhitespace) {
            reportItem.suggestions.push({
                id: `whitespace_${header}`,
                description: `Extra spaces found in "${header}"`,
                operation: { type: 'trim_whitespace', params: { column: header } },
                isPremium: false,
                priority: 'medium'
            });
        }

        // Check for inconsistent casing
        const uniqueOriginals = new Set(values.map(v => String(v)));
        const uniqueLowercased = new Set(values.map(v => String(v).toLowerCase()));
        if (uniqueOriginals.size > uniqueLowercased.size + 2) {
            reportItem.suggestions.push({
                id: `casing_${header}`,
                description: `Inconsistent text casing in "${header}"`,
                operation: { type: 'format_name_titlecase', params: { column: header } },
                isPremium: false,
                priority: 'medium'
            });
        }
    }

    // Smart type-specific suggestions
    switch (detectedType) {
        case 'phone':
            reportItem.suggestions.push({
                id: `format_phone_${header}`,
                description: `Format phone numbers in "${header}" consistently`,
                operation: { type: 'smart_format_phone', params: { column: header, fallbackCountry: 'US' } },
                isPremium: false,
                priority: 'high'
            });
            break;
            
        case 'postal_code':
            reportItem.suggestions.push({
                id: `format_postal_${header}`,
                description: `Standardize postal code format in "${header}"`,
                operation: { type: 'smart_format_postal_code', params: { column: header, fallbackCountry: 'US' } },
                isPremium: false,
                priority: 'medium'
            });
            break;
            
        case 'email':
            reportItem.suggestions.push({
                id: `format_email_${header}`,
                description: `Standardize email format in "${header}"`,
                operation: { type: 'format_email', params: { column: header } },
                isPremium: false,
                priority: 'high'
            });
            break;
    }

    // Duplicate value detection
    if (stats.uniqueCount / stats.totalRows < 0.3 && stats.totalRows > 10) {
        reportItem.suggestions.push({
            id: `potential_duplicates_${header}`,
            description: `High duplicate rate (${Math.round((1 - stats.uniqueCount / stats.totalRows) * 100)}%) in "${header}"`,
            operation: { 
                type: 'column_level_deduplication', 
                params: { 
                    column: header,
                    keep: 'first',
                    emptyAction: 'keep'
                } 
            },
            isPremium: true,
            priority: 'medium'
        });
    }

    // Fuzzy duplicate detection for name/email columns
    if ((detectedType === 'text' && header.toLowerCase().includes('name')) || 
        (detectedType === 'email')) {
        reportItem.suggestions.push({
            id: `fuzzy_duplicates_${header}`,
            description: `Check for fuzzy duplicates in "${header}" (typos, variations)`,
            operation: { 
                type: 'find_similar_values', 
                params: { 
                    column: header,
                    similarityThreshold: 0.8,
                    minGroupSize: 2,
                    action: 'highlight'
                } 
            },
            isPremium: true,
            priority: 'low'
        });
    }

    // Low uniqueness warning
    if (stats.uniqueCount / stats.totalRows < 0.1 && stats.totalRows > 10) {
        reportItem.suggestions.push({
            id: `low_uniqueness_${header}`,
            description: `Low data uniqueness (${Math.round((stats.uniqueCount / stats.totalRows) * 100)}%) in "${header}"`,
            operation: null,
            isPremium: false,
            priority: 'low',
            warning: true
        });
    }
};

/**
 * Generate global file-wide suggestions
 */
const generateGlobalSuggestions = (unifiedReport, data, headers, columnStats) => {
    // Check for fully empty rows
    const emptyRowCount = data.filter(row => headers.every(h => !row[h] || String(row[h]).trim() === '')).length;
    if (emptyRowCount > 0) {
        unifiedReport.unshift({
            type: 'global',
            id: 'empty_rows',
            description: `Found ${emptyRowCount} completely empty rows`,
            operation: { type: 'remove_empty_rows', params: {} },
            isPremium: false,
            priority: 'medium'
        });
    }

    // Suggest column removal for mostly empty columns
    Object.entries(columnStats).forEach(([header, stats]) => {
        if (stats.emptyCount / stats.totalRows > 0.8 && stats.totalRows > 10) {
            unifiedReport.unshift({
                type: 'global',
                id: `mostly_empty_${header}`,
                description: `Column "${header}" is ${Math.round((stats.emptyCount / stats.totalRows) * 100)}% empty`,
                operation: { type: 'remove_columns', params: { columns: [header] } },
                isPremium: false,
                priority: 'low'
            });
        }
    });
};

/**
 * Analyze duplicates across the dataset
 */
const analyzeDuplicates = (data, headers) => {
    const duplicateReport = [];
    
    // Check for exact duplicate rows
    const exactDuplicates = findExactDuplicateRows(data, headers);
    if (exactDuplicates.size > 0) {
        duplicateReport.push({
            type: 'global',
            id: 'exact_duplicate_rows',
            description: `Found ${exactDuplicates.size} sets of exactly duplicate rows`,
            operation: { 
                type: 'remove_duplicates', 
                params: { columns: headers } 
            },
            isPremium: true,
            priority: 'high',
            details: {
                duplicateSets: Array.from(exactDuplicates.values()),
                totalAffected: Array.from(exactDuplicates.values())
                    .reduce((sum, set) => sum + set.duplicateIndices.length, 0)
            }
        });
    }

    // Check for fuzzy duplicates on key columns
    const keyColumns = headers.filter(h => 
        h.toLowerCase().includes('name') || 
        h.toLowerCase().includes('email') ||
        h.toLowerCase().includes('phone')
    );
    
    if (keyColumns.length > 0) {
        const fuzzyDuplicates = findSimilarRows(data, keyColumns, {
            similarityThreshold: 0.85,
            minMatches: 1
        });
        
        if (fuzzyDuplicates.size > 0) {
            duplicateReport.push({
                type: 'global',
                id: 'fuzzy_duplicate_rows',
                description: `Found ${fuzzyDuplicates.size} sets of similar rows (typos/variations)`,
                operation: { 
                    type: 'fuzzy_remove_duplicates', 
                    params: { 
                        columns: keyColumns,
                        similarityThreshold: 0.85,
                        minColumnMatches: 1,
                        keep: 'first'
                    } 
                },
                isPremium: true,
                priority: 'medium',
                details: {
                    duplicateSets: Array.from(fuzzyDuplicates.values()),
                    totalAffected: Array.from(fuzzyDuplicates.values())
                        .reduce((sum, set) => sum + set.duplicateIndices.length, 0)
                }
            });
        }
    }

    return duplicateReport;
};

/**
 * Find exact duplicate rows in the dataset
 */
const findExactDuplicateRows = (data, headers) => {
    const seen = new Map();
    const duplicates = new Map();
    
    data.forEach((row, index) => {
        const fingerprint = headers.map(h => String(row[h] || '').toLowerCase().trim()).join('|');
        
        if (seen.has(fingerprint)) {
            const primaryIndex = seen.get(fingerprint);
            if (!duplicates.has(primaryIndex)) {
                duplicates.set(primaryIndex, {
                    primaryIndex,
                    duplicateIndices: [index],
                    matchCount: 2
                });
            } else {
                duplicates.get(primaryIndex).duplicateIndices.push(index);
                duplicates.get(primaryIndex).matchCount++;
            }
        } else {
            seen.set(fingerprint, index);
        }
    });
    
    return duplicates;
};

/**
 * Get summary statistics for the dataset
 */
export const getDatasetStats = (data, headers) => {
    if (!data || !headers) return null;
    
    const stats = {
        totalRows: data.length,
        totalColumns: headers.length,
        emptyRows: 0,
        completeRows: 0,
        columnStats: {}
    };
    
    // Count empty and complete rows
    data.forEach(row => {
        const emptyCells = headers.filter(h => !row[h] || String(row[h]).trim() === '').length;
        if (emptyCells === headers.length) {
            stats.emptyRows++;
        } else if (emptyCells === 0) {
            stats.completeRows++;
        }
    });
    
    // Column statistics
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
        const nonEmptyValues = values.filter(val => String(val).trim() !== '');
        
        stats.columnStats[header] = {
            total: values.length,
            nonEmpty: nonEmptyValues.length,
            empty: values.length - nonEmptyValues.length,
            unique: new Set(nonEmptyValues.map(v => String(v).toLowerCase())).size,
            completeness: nonEmptyValues.length / values.length
        };
    });
    
    return stats;
};

export default analyzeData;