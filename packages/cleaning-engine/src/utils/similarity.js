/**
 * Advanced duplicate detection with international fuzzy matching
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export const levenshteinDistance = (str1, str2) => {
    if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
    
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[len1][len2];
};

/**
 * Calculate similarity score between 0 and 1
 */
export const similarityScore = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
};

/**
 * Normalize string for better international comparison
 */
export const normalizeString = (str, options = {}) => {
    if (!str) return '';
    
    const {
        removeDiacritics = true,
        caseSensitive = false,
        preserveNumbers = true
    } = options;
    
    let normalized = String(str);
    
    if (removeDiacritics) {
        normalized = normalized.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    }
    
    if (!caseSensitive) {
        normalized = normalized.toLowerCase();
    }
    
    normalized = normalized
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    
    if (!preserveNumbers) {
        normalized = normalized.replace(/\d/g, '');
    }
    
    return normalized;
};

/**
 * Advanced similarity with multiple strategies for international text
 */
export const advancedSimilarity = (val1, val2, options = {}) => {
    const {
        useNormalization = true,
        minSimilarity = 0.8,
        strategy = 'combined',
        locale = 'en'
    } = options;

    let str1 = String(val1 || '');
    let str2 = String(val2 || '');

    // Quick exact match check
    if (str1 === str2) return 1;

    if (useNormalization) {
        str1 = normalizeString(str1, { locale });
        str2 = normalizeString(str2, { locale });
        
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
            
        case 'cosine':
            score = cosineSimilarity(str1, str2);
            break;
            
        case 'combined':
        default:
            // Use weighted average of multiple methods
            const levScore = similarityScore(str1, str2);
            const jwScore = jaroWinklerSimilarity(str1, str2);
            const cosScore = cosineSimilarity(str1, str2);
            score = (levScore * 0.4) + (jwScore * 0.4) + (cosScore * 0.2);
            break;
    }

    return score >= minSimilarity ? score : 0;
};

/**
 * Jaro-Winkler similarity for short strings and names
 */
const jaroWinklerSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    
    let matches = 0;
    let transpositions = 0;

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
 * Cosine similarity for longer text comparison
 */
const cosineSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    // Create character frequency vectors
    const vector1 = createCharVector(str1);
    const vector2 = createCharVector(str2);
    
    const dotProduct = calculateDotProduct(vector1, vector2);
    const magnitude1 = calculateMagnitude(vector1);
    const magnitude2 = calculateMagnitude(vector2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
};

const createCharVector = (str) => {
    const vector = {};
    const normalized = str.toLowerCase().replace(/\s/g, '');
    
    for (const char of normalized) {
        vector[char] = (vector[char] || 0) + 1;
    }
    
    return vector;
};

const calculateDotProduct = (vec1, vec2) => {
    let product = 0;
    const allChars = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    
    for (const char of allChars) {
        product += (vec1[char] || 0) * (vec2[char] || 0);
    }
    
    return product;
};

const calculateMagnitude = (vector) => {
    let sum = 0;
    for (const char in vector) {
        sum += vector[char] * vector[char];
    }
    return Math.sqrt(sum);
};

/**
 * Detect similar rows with international support
 */
export const findSimilarRows = (data, columns, options = {}) => {
    const {
        similarityThreshold = 0.85,
        minMatches = 1,
        strategy = 'combined',
        locale = 'en'
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

            for (const column of columns) {
                const val1 = currentRow[column];
                const val2 = compareRow[column];
                
                if (!val1 && !val2) {
                    columnMatches++;
                } else if (val1 && val2) {
                    const similarity = advancedSimilarity(val1, val2, {
                        strategy,
                        minSimilarity: similarityThreshold,
                        locale
                    });
                    
                    if (similarity > 0) {
                        columnMatches++;
                    }
                }
            }

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
        minGroupSize = 2,
        locale = 'en'
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
                minSimilarity: similarityThreshold,
                locale
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
 * Streaming duplicate detector for large international datasets
 */
export class StreamingDuplicateDetector {
    constructor(columns, options = {}) {
        this.columns = columns;
        this.similarityThreshold = options.similarityThreshold || 0.85;
        this.minMatches = options.minMatches || 1;
        this.keep = options.keep || 'first';
        this.locale = options.locale || 'en';
        this.seenHashes = new Map();
        this.processedCount = 0;
    }

    processRow(row, index) {
        this.processedCount++;
        
        const rowHash = this.generateFuzzyHash(row);
        
        for (const [existingHash, existingIndex] of this.seenHashes) {
            const similarity = this.calculateHashSimilarity(rowHash, existingHash);
            
            if (similarity >= this.similarityThreshold) {
                if (this.keep === 'first') {
                    return { isDuplicate: true, keep: false, duplicateOf: existingIndex };
                } else if (this.keep === 'last') {
                    this.seenHashes.delete(existingHash);
                    this.seenHashes.set(rowHash, index);
                    return { isDuplicate: true, keep: true, duplicateOf: existingIndex };
                }
            }
        }
        
        this.seenHashes.set(rowHash, index);
        return { isDuplicate: false, keep: true };
    }

    generateFuzzyHash(row) {
        const hashParts = this.columns.map(column => {
            const value = row[column];
            return value ? this.normalizeForHashing(String(value)) : '';
        });
        
        return hashParts.join('|');
    }

    normalizeForHashing(str) {
        return normalizeString(str, {
            removeDiacritics: true,
            caseSensitive: false,
            preserveNumbers: true,
            locale: this.locale
        }).substring(0, 25); // Limit length for performance
    }

    calculateHashSimilarity(hash1, hash2) {
        const parts1 = hash1.split('|');
        const parts2 = hash2.split('|');
        
        let matches = 0;
        let totalComparisons = 0;
        
        for (let i = 0; i < this.columns.length; i++) {
            if (!parts1[i] && !parts2[i]) continue;
            
            totalComparisons++;
            
            if (parts1[i] && parts2[i]) {
                const similarity = advancedSimilarity(parts1[i], parts2[i], {
                    minSimilarity: 0.1,
                    locale: this.locale
                });
                if (similarity > this.similarityThreshold) {
                    matches++;
                }
            }
        }
        
        return totalComparisons > 0 ? matches / totalComparisons : 0;
    }

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
 * Column-level duplicate detector with international support
 */
export class ColumnDuplicateDetector {
    constructor(column, options = {}) {
        this.column = column;
        this.keep = options.keep || 'first';
        this.emptyAction = options.emptyAction || 'keep';
        this.locale = options.locale || 'en';
        this.seenValues = new Map();
        this.processedCount = 0;
    }

    processRow(row, index) {
        this.processedCount++;
        const value = row[this.column];
        
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
                this.seenValues.set(normalized, index);
                return { keep: true, action: 'duplicate_kept_replaced' };
            } else if (this.keep === 'none') {
                this.seenValues.delete(normalized);
                return { keep: false, action: 'all_duplicates_removed' };
            }
        } else {
            this.seenValues.set(normalized, index);
            return { keep: true, action: 'unique_kept' };
        }
    }

    normalizeValue(value) {
        return normalizeString(String(value), {
            removeDiacritics: true,
            caseSensitive: false,
            preserveNumbers: true,
            locale: this.locale
        });
    }

    getStats() {
        return {
            processed: this.processedCount,
            unique: this.seenValues.size,
            duplicates: this.processedCount - this.seenValues.size
        };
    }
}