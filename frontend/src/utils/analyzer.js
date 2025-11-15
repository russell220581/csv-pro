// Frontend data analysis utilities
import { 
  detectPhoneCountry,
  detectPostalCodeCountry,
  detectDateFormat,
  detectCurrency,
  detectScript,
  normalizeUnicode,
  cleanNumber
} from '@csvpro/cleaning-engine/browser';

/**
 * Lightweight column analysis for frontend preview
 */
export function analyzeColumnPreview(data, columnName) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const columnValues = data.map(row => row[columnName]).filter(val => val != null && val !== '');
  
  if (columnValues.length === 0) {
    return {
      column: columnName,
      type: 'empty',
      stats: {
        total: data.length,
        nonEmpty: 0,
        empty: data.length,
        unique: 0
      },
      suggestions: []
    };
  }

  const analysis = {
    column: columnName,
    type: detectColumnType(columnValues, columnName),
    stats: {
      total: data.length,
      nonEmpty: columnValues.length,
      empty: data.length - columnValues.length,
      unique: new Set(columnValues.map(v => String(v).toLowerCase().trim())).size
    },
    sampleValues: columnValues.slice(0, 5),
    suggestions: []
  };

  // Generate suggestions based on detected type
  analysis.suggestions = generatePreviewSuggestions(analysis, columnValues);

  return analysis;
}

/**
 * Detect column type for preview
 */
function detectColumnType(values, columnName) {
  const sample = values.slice(0, 50);
  const columnLower = columnName.toLowerCase();

  // Quick pattern-based detection for browser
  if (columnLower.includes('email')) return 'email';
  if (columnLower.includes('phone') || columnLower.includes('mobile')) return 'phone';
  if (columnLower.includes('date') || columnLower.includes('time')) return 'date';
  if (columnLower.includes('zip') || columnLower.includes('postal')) return 'postal_code';
  if ((columnLower.includes('price') || columnLower.includes('amount')) && !columnLower.includes('name')) return 'money';

  // Content-based detection
  const emailCount = sample.filter(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())).length;
  if (emailCount > sample.length * 0.3) return 'email';

  const phoneCount = sample.filter(val => {
    const country = detectPhoneCountry(String(val));
    return country !== 'US'; // If we can detect a specific country, it's likely a phone
  }).length;
  if (phoneCount > sample.length * 0.3) return 'phone';

  const dateCount = sample.filter(val => detectDateFormat(String(val)) !== null).length;
  if (dateCount > sample.length * 0.3) return 'date';

  const numberCount = sample.filter(val => {
    const num = cleanNumber(val);
    return num !== null && !isNaN(num);
  }).length;
  if (numberCount > sample.length * 0.8) return 'number';

  return 'text';
}

/**
 * Generate preview suggestions
 */
function generatePreviewSuggestions(analysis, values) {
  const suggestions = [];

  // Always suggest trimming if needed
  const hasWhitespace = values.some(val => {
    const str = String(val);
    return str !== str.trim();
  });
  
  if (hasWhitespace) {
    suggestions.push({
      description: 'Remove leading/trailing whitespace',
      priority: 'high',
      operation: { type: 'trim_whitespace', params: { column: analysis.column } }
    });
  }

  // Type-specific suggestions
  switch (analysis.type) {
    case 'email':
      suggestions.push({
        description: 'Standardize email formatting',
        priority: 'medium',
        operation: { type: 'format_email', params: { column: analysis.column } }
      });
      break;

    case 'phone':
      suggestions.push({
        description: 'Format phone numbers',
        priority: 'medium',
        operation: { type: 'smart_format_phone', params: { column: analysis.column, fallbackCountry: 'US' } }
      });
      break;

    case 'date':
      suggestions.push({
        description: 'Standardize date format',
        priority: 'medium',
        operation: { type: 'format_date', params: { column: analysis.column, format: 'YYYY-MM-DD' } }
      });
      break;

    case 'money':
      suggestions.push({
        description: 'Clean and format currency',
        priority: 'medium',
        operation: { type: 'clean_numbers', params: { column: analysis.column } }
      });
      break;

    case 'text':
      // Check if text needs case normalization
      const needsCaseFix = values.some(val => {
        const str = String(val).trim();
        return str !== str.toLowerCase() && str !== str.toUpperCase();
      });
      
      if (needsCaseFix) {
        suggestions.push({
          description: 'Normalize text case',
          priority: 'low',
          operation: { type: 'smart_case_conversion', params: { column: analysis.column } }
        });
      }
      break;
  }

  return suggestions;
}

/**
 * Analyze dataset for global patterns
 */
export function analyzeGlobalPatterns(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { issues: [], suggestions: [] };
  }

  const issues = [];
  const suggestions = [];
  const headers = Object.keys(data[0] || {});

  // Check for empty rows
  const emptyRowCount = data.filter(row => 
    headers.every(header => !row[header] || String(row[header]).trim() === '')
  ).length;

  if (emptyRowCount > 0) {
    issues.push({
      type: 'empty_rows',
      count: emptyRowCount,
      percentage: (emptyRowCount / data.length) * 100,
      description: `${emptyRowCount} completely empty rows found`
    });

    suggestions.push({
      description: 'Remove empty rows',
      operation: { type: 'remove_empty_rows', params: {} }
    });
  }

  // Check for duplicate rows (simple check)
  const uniqueRows = new Set();
  const duplicateRows = [];

  data.forEach((row, index) => {
    const rowKey = headers.map(h => row[h] || '').join('|').toLowerCase().trim();
    if (uniqueRows.has(rowKey)) {
      duplicateRows.push(index);
    } else {
      uniqueRows.add(rowKey);
    }
  });

  if (duplicateRows.length > 0) {
    issues.push({
      type: 'duplicates',
      count: duplicateRows.length,
      percentage: (duplicateRows.length / data.length) * 100,
      description: `${duplicateRows.length} duplicate rows found`
    });

    suggestions.push({
      description: 'Remove duplicate rows',
      operation: { type: 'remove_duplicates', params: { columns: headers.slice(0, 3) } }
    });
  }

  return { issues, suggestions };
}

/**
 * Quick data quality score for preview
 */
export function calculatePreviewQualityScore(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return 100;

  let score = 100;
  const headers = Object.keys(data[0] || {});

  // Deduct for empty rows
  const emptyRowCount = data.filter(row => 
    headers.every(header => !row[header] || String(row[header]).trim() === '')
  ).length;
  score -= (emptyRowCount / data.length) * 30;

  // Deduct for inconsistent column counts
  const columnCounts = data.map(row => Object.keys(row).length);
  const uniqueCounts = new Set(columnCounts);
  if (uniqueCounts.size > 1) {
    score -= 10;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get column statistics for preview
 */
export function getColumnStats(data, columnName) {
  if (!data || !Array.isArray(data)) return null;

  const values = data.map(row => row[columnName]).filter(val => val != null && val !== '');
  
  return {
    total: data.length,
    nonEmpty: values.length,
    empty: data.length - values.length,
    unique: new Set(values.map(v => String(v).toLowerCase().trim())).size,
    sample: values.slice(0, 3)
  };
}

/**
 * Main analysis function for frontend (compatibility with old imports)
 */
export function analyzeData(data, headers, userPlan = 'free') {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      analysisReport: [],
      detectedOperations: [],
      summary: {
        totalIssues: 0,
        autoFixable: 0,
        dataQualityScore: 100
      }
    };
  }

  const analysisReport = [];
  const detectedOperations = [];

  // Analyze each column
  headers.forEach(header => {
    const columnAnalysis = analyzeColumnPreview(data, header);
    if (columnAnalysis) {
      analysisReport.push(columnAnalysis);
      
      // Auto-add high priority operations
      columnAnalysis.suggestions.forEach(suggestion => {
        if (suggestion.priority === 'high') {
          detectedOperations.push(suggestion.operation);
        }
      });
    }
  });

  // Analyze global issues
  const globalAnalysis = analyzeGlobalPatterns(data);
  if (globalAnalysis.issues.length > 0) {
    analysisReport.push({
      type: 'global',
      description: 'Dataset-level issues',
      suggestions: globalAnalysis.suggestions
    });
  }

  return {
    analysisReport,
    detectedOperations,
    summary: {
      totalIssues: analysisReport.length,
      autoFixable: detectedOperations.length,
      dataQualityScore: calculatePreviewQualityScore(data)
    }
  };
}

export default {
  analyzeData,
  analyzeColumnPreview,
  analyzeGlobalPatterns,
  calculatePreviewQualityScore,
  getColumnStats
};