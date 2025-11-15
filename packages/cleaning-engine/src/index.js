// Main package entry point - simple re-export
export { default as browser } from './browser.js';
export { default as node } from './node.js';
export { operations } from './operations.js';

// Export individual utilities for direct import
export { 
  normalizeUnicode,
  toTitleCase,
  toSentenceCase,
  toSmartCase,
  slugify,
  removeHtml,
  cleanNumber,
  formatDate,
  formatPostalCode,
  formatPhoneNumber,
  extractAreaCode,
  isValidPhoneNumber,
  formatCurrency,
  extractDomain,
  detectScript,
  detectPhoneCountry,
  detectPostalCodeCountry,
  detectDateFormat,
  detectCurrency
} from './utils/helpers.js';

// Default export for backward compatibility (points to browser for frontend)
import browser from './browser.js';

export default browser;