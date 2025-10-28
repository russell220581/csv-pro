/**
 * Advanced duplicate detection with fuzzy matching and similarity scoring
 */

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar
 */
export const levenshteinDistance = (str1, str2) => {
    if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
    
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // deletion
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
};

/**
 * Calculate similarity score between 0 and 1
 * 1 = identical, 0 = completely different
 */
export const similarityScore = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1; // Both empty
    
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
};

/**
 * Normalize string for better comparison
 */
export const normalizeString = (str) => {
    if (!str) return '';
    
    return String(str)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ');   // Normalize whitespace
};

/**
 * Advanced similarity with multiple strategies
 */
export const advancedSimilarity = (val1, val2, options = {}) => {
    const {
        useNormalization = true,
        minSimilarity = 0.8,
        strategy = 'combined'
    } = options;

    let str1 = String(val1 || '');
    let str2 = String(val2 || '');

    // Quick exact match check
    if (str1 === str2) return 1;

    // Normalize if requested
    if (useNormalization) {
        str1 = normalizeString(str1);
        str2 = normalizeString(str2);
        
        // Check again after normalization
        if (str1 === str2) return 1;
    }

    let score = 0;

    switch (strategy) {
        case 'levenshtein':
            score = similarityScore(str1, str2);
            break;
            
        case 'jaro-winkler':
            score = jaroWinklerSimilarity(str1, str2);
            break;
            
        case 'combined':
        default:
            // Use average of multiple methods for better accuracy
            const levScore = similarityScore(str1, str2);
            const jwScore = jaroWinklerSimilarity(str1, str2);
            score = (levScore + jwScore) / 2;
            break;
    }

    return score >= minSimilarity ? score : 0;
};

/**
 * Jaro-Winkler similarity algorithm (good for names and short strings)
 */
const jaroWinklerSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Jaro similarity
    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    
    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, s2.length);
        
        for (let j = start; j < end; j++) {
            if (!s2Matches[j] && s1[i] === s2[j]) {
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
    }

    if (matches === 0) return 0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1Matches[i]) {
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }
    }

    const jaro = (
        (matches / s1.length) +
        (matches / s2.length) +
        ((matches - transpositions / 2) / matches)
    ) / 3;

    // Winkler modification (prefix scale)
    const prefixScale = 0.1;
    let prefix = 0;
    const maxPrefix = Math.min(4, s1.length, s2.length);
    
    for (let i = 0; i < maxPrefix; i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    return jaro + (prefix * prefixScale * (1 - jaro));
};

/**
 * Detect similar rows based on multiple columns
 */
export const findSimilarRows = (data, columns, options = {}) => {
    const {
        similarityThreshold = 0.85,
        minMatches = 1,
        strategy = 'combined'
    } = options;

    const duplicates = new Map();
    const processed = new Set();

    for (let i = 0; i < data.length; i++) {
        if (processed.has(i)) continue;

        const currentRow = data[i];
        const similarRows = [i];

        for (let j = i + 1; j < data.length; j++) {
            if (processed.has(j)) continue;

            const compareRow = data[j];
            let columnMatches = 0;

            // Check similarity for each specified column
            for (const column of columns) {
                const val1 = currentRow[column];
                const val2 = compareRow[column];
                
                if (!val1 && !val2) {
                    // Both empty counts as a match
                    columnMatches++;
                } else if (val1 && val2) {
                    const similarity = advancedSimilarity(val1, val2, {
                        strategy,
                        minSimilarity: similarityThreshold
                    });
                    
                    if (similarity > 0) {
                        columnMatches++;
                    }
                }
            }

            // If enough columns match, consider it a duplicate
            if (columnMatches >= minMatches) {
                similarRows.push(j);
                processed.add(j);
            }
        }

        if (similarRows.length > 1) {
            duplicates.set(i, {
                primaryIndex: i,
                duplicateIndices: similarRows.slice(1),
                matchCount: similarRows.length,
                sampleData: currentRow
            });
        }

        processed.add(i);
    }

    return duplicates;
};

/**
 * Group similar values within a single column
 */
export const findSimilarValues = (data, column, options = {}) => {
    const {
        similarityThreshold = 0.8,
        minGroupSize = 2
    } = options;

    const groups = new Map();
    const processed = new Set();

    for (let i = 0; i < data.length; i++) {
        if (processed.has(i)) continue;

        const currentValue = data[i][column];
        if (!currentValue) continue;

        const similarIndices = [i];
        const canonicalValue = currentValue;

        for (let j = i + 1; j < data.length; j++) {
            if (processed.has(j)) continue;

            const compareValue = data[j][column];
            if (!compareValue) continue;

            const similarity = advancedSimilarity(currentValue, compareValue, {
                minSimilarity: similarityThreshold
            });

            if (similarity > 0) {
                similarIndices.push(j);
                processed.add(j);
            }
        }

        if (similarIndices.length >= minGroupSize) {
            groups.set(canonicalValue, {
                canonicalValue,
                indices: similarIndices,
                count: similarIndices.length,
                examples: similarIndices.slice(0, 3).map(idx => data[idx][column])
            });
        }

        processed.add(i);
    }

    return groups;
};

/**
 * Streaming duplicate detector for large datasets
 */
export class StreamingDuplicateDetector {
    constructor(columns, options = {}) {
        this.columns = columns;
        this.similarityThreshold = options.similarityThreshold || 0.85;
        this.minMatches = options.minMatches || 1;
        this.keep = options.keep || 'first';
        this.seenHashes = new Map();
        this.processedCount = 0;
    }

    /**
     * Process a row and determine if it's a duplicate
     */
    processRow(row, index) {
        this.processedCount++;
        
        // Generate fuzzy hash for comparison
        const rowHash = this.generateFuzzyHash(row);
        
        // Check against seen rows
        for (const [existingHash, existingIndex] of this.seenHashes) {
            const similarity = this.calculateHashSimilarity(rowHash, existingHash);
            
            if (similarity >= this.similarityThreshold) {
                // Duplicate found - decide which to keep
                if (this.keep === 'first') {
                    return { isDuplicate: true, keep: false, duplicateOf: existingIndex };
                } else if (this.keep === 'last') {
                    // Mark previous as duplicate, keep current
                    this.seenHashes.delete(existingHash);
                    this.seenHashes.set(rowHash, index);
                    return { isDuplicate: true, keep: true, duplicateOf: existingIndex };
                }
            }
        }
        
        // Not a duplicate, add to seen rows
        this.seenHashes.set(rowHash, index);
        return { isDuplicate: false, keep: true };
    }

    /**
     * Generate a fuzzy hash for row comparison
     */
    generateFuzzyHash(row) {
        const hashParts = this.columns.map(column => {
            const value = row[column] || '';
            return this.normalizeForHashing(String(value));
        });
        
        return hashParts.join('|');
    }

    /**
     * Normalize value for hashing (more aggressive than comparison)
     */
    normalizeForHashing(str) {
        return String(str)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .substring(0, 20); // Limit length for performance
    }

    /**
     * Calculate similarity between two fuzzy hashes
     */
    calculateHashSimilarity(hash1, hash2) {
        const parts1 = hash1.split('|');
        const parts2 = hash2.split('|');
        
        let matches = 0;
        for (let i = 0; i < this.columns.length; i++) {
            if (!parts1[i] && !parts2[i]) {
                matches++;
            } else if (parts1[i] && parts2[i]) {
                const similarity = advancedSimilarity(parts1[i], parts2[i], {
                    minSimilarity: 0.1 // Lower threshold for hash comparison
                });
                if (similarity > this.similarityThreshold) {
                    matches++;
                }
            }
        }
        
        return matches / this.columns.length;
    }

    /**
     * Get statistics about processed data
     */
    getStats() {
        return {
            processed: this.processedCount,
            unique: this.seenHashes.size,
            duplicates: this.processedCount - this.seenHashes.size,
            duplicateRate: (this.processedCount - this.seenHashes.size) / this.processedCount
        };
    }
}

/**
 * Column-level duplicate detector
 */
export class ColumnDuplicateDetector {
    constructor(column, options = {}) {
        this.column = column;
        this.keep = options.keep || 'first';
        this.emptyAction = options.emptyAction || 'keep';
        this.seenValues = new Map();
        this.processedCount = 0;
    }

    /**
     * Process a row for column-level deduplication
     */
    processRow(row, index) {
        this.processedCount++;
        const value = row[this.column];
        
        // Handle empty values
        if (!value || String(value).trim() === '') {
            return this.emptyAction === 'keep' 
                ? { keep: true, action: 'empty_kept' }
                : { keep: false, action: 'empty_removed' };
        }
        
        const normalized = this.normalizeValue(value);
        
        if (this.seenValues.has(normalized)) {
            const existingIndex = this.seenValues.get(normalized);
            
            if (this.keep === 'first') {
                return { keep: false, action: 'duplicate_removed', duplicateOf: existingIndex };
            } else if (this.keep === 'last') {
                // Update to keep this one instead
                this.seenValues.set(normalized, index);
                return { keep: true, action: 'duplicate_kept_replaced' };
            } else if (this.keep === 'none') {
                // Remove all duplicates
                this.seenValues.delete(normalized);
                return { keep: false, action: 'all_duplicates_removed' };
            }
        } else {
            this.seenValues.set(normalized, index);
            return { keep: true, action: 'unique_kept' };
        }
    }

    /**
     * Normalize value for comparison
     */
    normalizeValue(value) {
        return String(value)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            processed: this.processedCount,
            unique: this.seenValues.size,
            duplicates: this.processedCount - this.seenValues.size
        };
    }
}