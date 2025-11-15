// Browser-compatible version of cleaning engine

// Import helper functions first
import { 
  normalizeUnicode,
  toTitleCase,
  toSentenceCase, 
  toSmartCase,
  slugify,
  removeHtml,
  cleanNumber,
  detectScript,
  detectPhoneCountry,
  detectPostalCodeCountry,
  detectDateFormat,
  detectCurrency,
  extractDomain,
  cleanHeaders
} from './utils/helpers.js';

// Import the full operations for browser compatibility
import { operations } from './operations.js';

// Browser-safe operation filtering
const browserSafeOperations = {};

// Only include operations that don't require Node.js or heavy dependencies
const safeOperationTypes = [
  'trim_whitespace_all',
  'trim_whitespace', 
  'change_case',
  'format_name_titlecase',
  'format_sentence_case',
  'smart_case_conversion',
  'remove_empty_rows',
  'remove_empty_cells',
  'remove_columns',
  'standardize_columns',
  'find_and_replace',
  'remove_html',
  'convert_to_slug',
  'extract_domain'
];

// Filter operations for browser safety
Object.keys(operations).forEach(opType => {
  if (safeOperationTypes.includes(opType)) {
    browserSafeOperations[opType] = operations[opType];
  }
});

/**
 * Browser-compatible cleaning function for small datasets
 */
export function cleanDataInBrowser(data, operationsToApply) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return data;
  }

  const cleanedData = [];
  const headers = Object.keys(data[0] || {});
  
  // Simple state for browser operations
  const state = {
    duplicates: new Map(),
    seenValues: new Map()
  };

  data.forEach((row, index) => {
    let processedRow = { ...row };
    let shouldInclude = true;

    try {
      operationsToApply.forEach(operation => {
        const result = applyBrowserOperation(processedRow, operation, headers, state, index);
        
        if (result.filteredOut) {
          shouldInclude = false;
          return;
        }
        
        processedRow = result.row;
      });
    } catch (error) {
      console.warn('Browser cleaning error:', error);
      // Continue with original row on error
    }

    if (shouldInclude) {
      cleanedData.push(processedRow);
    }
  });

  return cleanedData;
}

/**
 * Apply a single operation in browser environment
 */
function applyBrowserOperation(row, operation, headers, state, rowIndex) {
  let processedRow = { ...row };
  let filteredOut = false;

  const opType = operation.type;
  const params = operation.params || {};

  try {
    switch (opType) {
      case 'trim_whitespace_all':
        Object.keys(processedRow).forEach(key => {
          if (processedRow[key] && typeof processedRow[key] === 'string') {
            processedRow[key] = processedRow[key].trim();
          }
        });
        break;

      case 'trim_whitespace':
        if (params.column) {
          if (processedRow[params.column] && typeof processedRow[params.column] === 'string') {
            processedRow[params.column] = processedRow[params.column].trim();
          }
        }
        break;

      case 'change_case':
        if (params.column && processedRow[params.column]) {
          const value = String(processedRow[params.column]);
          if (params.case === 'uppercase') {
            processedRow[params.column] = value.toUpperCase();
          } else if (params.case === 'lowercase') {
            processedRow[params.column] = value.toLowerCase();
          }
        }
        break;

      case 'smart_case_conversion':
      case 'format_name_titlecase':
      case 'format_sentence_case':
        if (params.column && processedRow[params.column]) {
          // Simple case conversion for browser preview
          const value = String(processedRow[params.column]);
          processedRow[params.column] = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
        break;

      case 'remove_empty_rows':
        const isEmpty = Object.values(processedRow).every(val => 
          !val || String(val).trim() === ''
        );
        if (isEmpty) filteredOut = true;
        break;

      case 'remove_empty_cells':
        if (params.column && processedRow[params.column]) {
          const value = String(processedRow[params.column]).trim();
          if (value === '') processedRow[params.column] = '';
        }
        break;

      case 'remove_columns':
        if (params.columns) {
          params.columns.forEach(column => {
            delete processedRow[column];
          });
        }
        break;

      case 'standardize_columns':
        headers.forEach(header => {
          if (!(header in processedRow)) processedRow[header] = '';
        });
        Object.keys(processedRow).forEach(key => {
          if (!headers.includes(key)) delete processedRow[key];
        });
        break;

      case 'find_and_replace':
        if (params.column && processedRow[params.column]) {
          const find = params.find;
          const replace = params.replace || '';
          const regex = new RegExp(find, 'gi');
          processedRow[params.column] = String(processedRow[params.column])
            .replace(regex, replace);
        }
        break;

      case 'remove_html':
        if (params.column && processedRow[params.column]) {
          processedRow[params.column] = removeHtml(processedRow[params.column]);
        }
        break;

      case 'convert_to_slug':
        if (params.column && processedRow[params.column]) {
          processedRow[params.column] = slugify(processedRow[params.column]);
        }
        break;

      case 'extract_domain':
        if (params.column && processedRow[params.column]) {
          processedRow[`${params.column}_domain`] = extractDomain(processedRow[params.column]);
        }
        break;

      case 'remove_duplicates':
        if (params.columns) {
          const key = params.columns
            .map(col => String(processedRow[col] || '').toLowerCase().trim())
            .join('||');

          if (!state.duplicates.has(key)) {
            state.duplicates.set(key, true);
          } else {
            filteredOut = true;
          }
        }
        break;

      default:
        console.warn(`Browser operation not implemented: ${opType}`);
    }
  } catch (error) {
    console.error(`Browser operation error (${opType}):`, error);
  }

  return { row: processedRow, filteredOut };
}

/**
 * Preview operations in browser (for live preview)
 */
export function previewOperations(data, operationsToApply, sampleSize = 50) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { previewData: [], stats: { total: 0, previewed: 0 } };
  }

  const sampleData = data.slice(0, Math.min(sampleSize, data.length));
  const previewData = cleanDataInBrowser(sampleData, operationsToApply);

  return {
    previewData,
    stats: {
      total: data.length,
      previewed: sampleData.length,
      previewRows: previewData.length
    }
  };
}

/**
 * Validate operations for browser compatibility
 */
export function validateBrowserOperations(operations) {
  const validOperations = [];
  const warnings = [];

  operations.forEach(op => {
    if (browserSafeOperations[op.type]) {
      validOperations.push(op);
    } else {
      warnings.push(`Operation '${op.type}' not supported in browser preview`);
    }
  });

  return {
    valid: validOperations.length > 0,
    operations: validOperations,
    warnings,
    supportedCount: validOperations.length,
    unsupportedCount: operations.length - validOperations.length
  };
}

/**
 * Browser-compatible engine runner (legacy compatibility)
 */
export function runEngine(data, operations, options = {}) {
  console.warn('runEngine is deprecated, use cleanDataInBrowser instead');
  return cleanDataInBrowser(data, operations);
}

// Export browser-safe operations
export { browserSafeOperations as operations };

// Export all helper functions for frontend compatibility
export {
  normalizeUnicode,
  toTitleCase,
  toSentenceCase,
  toSmartCase,
  slugify,
  removeHtml,
  cleanNumber,
  detectScript,
  detectPhoneCountry,
  detectPostalCodeCountry,
  detectDateFormat,
  detectCurrency,
  extractDomain,
  cleanHeaders
};

// Default export for convenience
export default {
  cleanDataInBrowser,
  previewOperations,
  validateBrowserOperations,
  runEngine,
  operations: browserSafeOperations,
  utils: {
    normalizeUnicode,
    toTitleCase,
    toSentenceCase,
    toSmartCase,
    slugify,
    removeHtml,
    cleanNumber,
    detectScript,
    detectPhoneCountry,
    detectPostalCodeCountry,
    detectDateFormat,
    detectCurrency,
    extractDomain,
    cleanHeaders
  }
};