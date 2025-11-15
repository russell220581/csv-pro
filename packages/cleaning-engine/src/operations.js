import { z } from 'zod';
import { 
  toTitleCase, 
  slugify, 
  removeHtml, 
  cleanNumber, 
  formatDate, 
  toSentenceCase, 
  toSmartCase, 
  formatPostalCode, 
  formatPhoneNumber, 
  extractAreaCode,
  cleanHeaders,
  formatCurrency,
  extractDomain,
  normalizeUnicode,
  detectPhoneCountry,
  detectPostalCodeCountry,
  detectDateFormat,
  detectScript
} from './utils/helpers.js';
import { findSimilarRows, findSimilarValues, advancedSimilarity } from './utils/similarity.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import pkg from 'validator';
const { isPostalCode, isEmail, isURL, isIP } = pkg;

export const operations = {
  // === GLOBAL HEADER OPERATIONS ===
  'standardize_headers': {
    name: 'Standardize Headers',
    description: 'Clean and standardize all column headers with international support.',
    isPremium: false,
    icon: 'FaColumns',
    schema: z.object({}),
    getDetails: () => 'Smart header standardization with global pattern recognition',
    headerExecutor: (headers) => cleanHeaders(headers),
    rowExecutor: null,
  },

  'remove_columns': {
    name: 'Remove Columns',
    description: 'Permanently delete one or more columns.',
    isPremium: false,
    icon: 'FaColumns',
    schema: z.object({
      columns: z.array(z.string()).min(1, 'You must select at least one column.'),
    }),
    getDetails: (params) => {
      const count = params.columns.length;
      const columns = params.columns.slice(0, 2).join(', ');
      const remainder = count > 2 ? ` & ${count - 2} more` : '';
      return `Removed: ${columns}${remainder}`;
    },
    headerExecutor: (headers, params) => headers.filter(h => !params.columns.includes(h)),
    rowExecutor: null,
  },

  // === GLOBAL TEXT CLEANING OPERATIONS ===
  'trim_whitespace_all': {
    name: 'Trim All Whitespace',
    description: 'Remove spaces from beginning and end of ALL columns automatically.',
    isPremium: false,
    icon: 'FaBroom',
    schema: z.object({}),
    getDetails: () => 'Trim whitespace from all columns',
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params, headers) => {
      Object.keys(row).forEach(column => {
        if (row[column] && typeof row[column] === 'string') {
          row[column] = row[column].trim();
        }
      });
      return row;
    },
  },

  'trim_whitespace': {
    name: 'Trim Whitespace',
    description: 'Remove spaces from the beginning and end of text in specific columns.',
    isPremium: false,
    icon: 'FaBroom',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => {
      if (params.column === 'all') {
        return 'Trim whitespace from all columns';
      }
      return `Trim spaces from "${params.column}"`;
    },
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params, headers) => {
      if (params.column === 'all') {
        Object.keys(row).forEach(column => {
          if (row[column] && typeof row[column] === 'string') {
            row[column] = row[column].trim();
          }
        });
      } else if (row[params.column]) {
        row[params.column] = String(row[params.column]).trim();
      }
      return row;
    },
  },

  'change_case': {
    name: 'Change Text Case',
    description: 'Convert text in a column to UPPERCASE or lowercase.',
    isPremium: false,
    icon: 'FaFont',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      case: z.enum(['uppercase', 'lowercase']),
    }),
    getDetails: (params) => `Set "${params.column}" to ${params.case}`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[params.column] = params.case === 'uppercase'
          ? String(row[params.column]).toUpperCase()
          : String(row[params.column]).toLowerCase();
      }
      return row;
    },
  },

  'smart_case_conversion': {
    name: 'Smart Case Correction',
    description: 'Automatically fix mixed case text while preserving proper nouns globally.',
    isPremium: true,
    icon: 'FaMagic',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Smart case correction for "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[params.column] = toSmartCase(row[params.column]);
      }
      return row;
    },
  },

  'format_name_titlecase': {
    name: 'Format to Title Case',
    description: 'Convert "john smith" to "John Smith" with international name support.',
    isPremium: false,
    icon: 'FaPen',
    schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
    getDetails: (params) => `Title Case "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) row[params.column] = toTitleCase(row[params.column]);
      return row;
    },
  },

  'format_sentence_case': {
    name: 'Sentence Case',
    description: 'Convert text to sentence case (first letter uppercase).',
    isPremium: false,
    icon: 'FaFont',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Convert "${params.column}" to sentence case`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[params.column] = toSentenceCase(row[params.column]);
      }
      return row;
    },
  },

  // === GLOBAL CONTACT DATA OPERATIONS ===
  'format_email': {
    name: 'Format Emails',
    description: 'Standardize email formatting (lowercase, trimmed) with validation.',
    isPremium: false,
    icon: 'FaEnvelope',
    schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
    getDetails: (params) => `Format emails in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const email = String(row[params.column]).trim().toLowerCase();
        // Basic email validation
        if (isEmail(email)) {
          row[params.column] = email;
        }
      }
      return row;
    },
  },

  'smart_format_phone': {
    name: 'Smart Phone Formatting',
    description: 'Automatically detect country and format phone numbers globally.',
    isPremium: false,
    icon: 'FaPhoneAlt',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      fallbackCountry: z.string().min(2).max(2).default('US'),
    }),
    getDetails: (params) => `Smart format phone numbers in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[params.column] = formatPhoneNumber(row[params.column], 'auto');
      }
      return row;
    },
  },

  'format_phone': {
    name: 'Format Phone Numbers',
    description: 'Standardize phone numbers into a specific international format.',
    isPremium: false,
    icon: 'FaPhoneAlt',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      country: z.string().min(2).max(2, 'Country code must be 2 letters.').default('US'),
      format: z.enum(['E.164', 'NATIONAL', 'INTERNATIONAL']).default('INTERNATIONAL'),
    }),
    getDetails: (params) => `Format phone numbers in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      const phone = row[params.column];
      if (phone) {
        try {
          const phoneNumber = parsePhoneNumberFromString(String(phone), params.country);
          if (phoneNumber && phoneNumber.isValid()) {
            row[params.column] = phoneNumber.format(params.format);
          }
        } catch (error) {
          // Leave original value on failure
        }
      }
      return row;
    },
  },

  // === GLOBAL DATE OPERATIONS ===
  'format_date': {
    name: 'Format Dates',
    description: 'Standardize dates to consistent international formats.',
    isPremium: false,
    icon: 'FaCalendarAlt',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      format: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD']),
    }),
    getDetails: (params) => `Format dates in "${params.column}" to ${params.format}`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) row[params.column] = formatDate(row[params.column], params.format);
      return row;
    },
  },

  // === GLOBAL LOCATION OPERATIONS ===
  'smart_format_postal_code': {
    name: 'Smart Postal Code Formatting',
    description: 'Automatically detect country and format postal codes globally.',
    isPremium: false,
    icon: 'FaMapMarkerAlt',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      fallbackCountry: z.string().min(2).max(2).default('US'),
    }),
    getDetails: (params) => `Smart format postal codes in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[params.column] = formatPostalCode(row[params.column], 'auto');
      }
      return row;
    },
  },

  // === GLOBAL FINANCIAL OPERATIONS ===
  'clean_numbers': {
    name: 'Clean Numbers',
    description: 'Remove currency symbols and other non-numeric characters globally.',
    isPremium: false,
    icon: 'FaBroom',
    schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
    getDetails: (params) => `Clean non-numeric characters from "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) row[params.column] = cleanNumber(row[params.column]);
      return row;
    },
  },

  'format_currency': {
    name: 'Format Currency',
    description: 'Standardize currency formatting with international support.',
    isPremium: true,
    icon: 'FaDollarSign',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      currency: z.string().default('USD'),
      locale: z.string().default('en-US'),
    }),
    getDetails: (params) => `Format currency in "${params.column}" as ${params.currency}`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const number = cleanNumber(row[params.column]);
        if (!isNaN(number) && isFinite(number)) {
          row[params.column] = new Intl.NumberFormat(params.locale, {
            style: 'currency',
            currency: params.currency,
          }).format(number);
        }
      }
      return row;
    },
  },

  // === DATA QUALITY OPERATIONS ===
  'remove_empty_rows': {
    name: 'Remove Empty Rows',
    description: 'Delete rows where every cell is empty.',
    isPremium: false,
    icon: 'FaFilter',
    schema: z.object({}),
    getDetails: () => 'Delete all completely blank rows',
    headerExecutor: (headers) => headers,
    rowFilter: (row, params, headers) => {
      const rowKeys = Object.keys(row);
      return !rowKeys.every(key => !row[key] || String(row[key]).trim() === '');
    },
  },

  'remove_empty_cells': {
    name: 'Remove Empty Cells',
    description: 'Remove empty cells from specific columns.',
    isPremium: false,
    icon: 'FaBroom',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Remove empty cells from "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (!row[params.column] || String(row[params.column]).trim() === '') {
        row[params.column] = '';
      }
      return row;
    },
  },

  'remove_non_numeric': {
    name: 'Remove Non-Numeric Values',
    description: 'Remove values that are not numbers from numeric columns.',
    isPremium: false,
    icon: 'FaFilter',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Remove non-numeric values from "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const value = String(row[params.column]).trim();
        if (isNaN(parseFloat(value)) || !isFinite(value)) {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  'standardize_boolean': {
    name: 'Standardize Boolean Values',
    description: 'Convert to consistent boolean values (true/false) with international support.',
    isPremium: false,
    icon: 'FaCheckSquare',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Standardize boolean values in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const value = String(row[params.column]).toLowerCase().trim();
        const trueValues = ['true', 'yes', '1', 'y', 'oui', 'si', 'ja', '是'];
        const falseValues = ['false', 'no', '0', 'n', 'non', 'nein', '否'];
        
        if (trueValues.includes(value)) {
          row[params.column] = 'true';
        } else if (falseValues.includes(value)) {
          row[params.column] = 'false';
        }
        // Leave other values unchanged
      }
      return row;
    },
  },

  'standardize_columns': {
    name: 'Standardize Columns',
    description: 'Ensure consistent number of columns across rows.',
    isPremium: true,
    icon: 'FaColumns',
    schema: z.object({}),
    getDetails: () => 'Standardize column structure across all rows',
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params, headers) => {
      // Ensure row has all expected headers
      headers.forEach(header => {
        if (!(header in row)) {
          row[header] = '';
        }
      });
      // Remove extra properties not in headers
      Object.keys(row).forEach(key => {
        if (!headers.includes(key)) {
          delete row[key];
        }
      });
      return row;
    },
  },

  // === VALIDATION OPERATIONS ===
  'validate_email': {
    name: 'Validate Email Format',
    description: 'Validate email format and remove invalid entries.',
    isPremium: true,
    icon: 'FaEnvelope',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Validate email format in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const email = String(row[params.column]).trim();
        if (!isEmail(email)) {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  'validate_phone': {
    name: 'Validate Phone Format',
    description: 'Validate phone format and remove invalid entries globally.',
    isPremium: true,
    icon: 'FaPhoneAlt',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Validate phone format in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const phone = String(row[params.column]).trim();
        const country = detectPhoneCountry(phone);
        try {
          const phoneNumber = parsePhoneNumberFromString(phone, country);
          if (!phoneNumber || !phoneNumber.isValid()) {
            row[params.column] = '';
          }
        } catch {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  'validate_url': {
    name: 'Validate URL Format',
    description: 'Validate URL format and remove invalid entries.',
    isPremium: true,
    icon: 'FaLink',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Validate URL format in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const url = String(row[params.column]).trim();
        if (!isURL(url)) {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  'validate_ip': {
    name: 'Validate IP Address Format',
    description: 'Validate IP address format and remove invalid entries.',
    isPremium: true,
    icon: 'FaNetworkWired',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
    }),
    getDetails: (params) => `Validate IP address format in "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        const ip = String(row[params.column]).trim();
        if (!isIP(ip)) {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  'validate_postal_code': {
    name: 'Validate Postal Codes',
    description: 'Check for valid postal codes globally. Clears invalid entries.',
    isPremium: true,
    icon: 'FaCheckSquare',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      country: z.string().min(2).max(2).default('US'),
    }),
    getDetails: (params) => `Validate postal codes in "${params.column}" for country ${params.country.toUpperCase()}`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        if (!isPostalCode(row[params.column], params.country.toUpperCase())) {
          row[params.column] = '';
        }
      }
      return row;
    },
  },

  // === DUPLICATE MANAGEMENT ===
  'remove_duplicates': {
    name: 'Remove Duplicates',
    description: 'Delete rows that are duplicates based on selected columns.',
    isPremium: true,
    icon: 'FaRegClone',
    schema: z.object({
      columns: z.array(z.string()).min(1, 'You must select at least one column.'),
    }),
    getDetails: (params) => `Based on column(s): ${params.columns.join(', ')}`,
    headerExecutor: (headers) => headers,
    rowFilter: null,
  },

  'fuzzy_remove_duplicates': {
    name: 'Fuzzy Duplicate Removal',
    description: 'Remove rows that are similar but not exactly identical (handles typos and variations).',
    isPremium: true,
    icon: 'FaUserFriends',
    schema: z.object({
      columns: z.array(z.string()).min(1, 'You must select at least one column.'),
      similarityThreshold: z.number().min(0.1).max(1.0).default(0.85),
      minColumnMatches: z.number().min(1).max(10).default(1),
      keep: z.enum(['first', 'last', 'most_complete']).default('first'),
    }),
    getDetails: (params) => `Fuzzy duplicates based on ${params.columns.join(', ')} (${Math.round(params.similarityThreshold * 100)}% similarity)`,
    headerExecutor: (headers) => headers,
    rowFilter: null,
  },

  'find_similar_values': {
    name: 'Find Similar Values',
    description: 'Identify and group similar values within a column (great for cleaning inconsistent data).',
    isPremium: true,
    icon: 'FaSearch',
    schema: z.object({
        column: z.string({ required_error: 'Please select a column.' }),
        similarityThreshold: z.number().min(0.1).max(1.0).default(0.8),
        minGroupSize: z.number().min(2).max(100).default(2),
        action: z.enum(['highlight', 'replace_with_canonical', 'remove_duplicates']).default('highlight'),
    }),
    getDetails: (params) => `Find similar values in "${params.column}" (${Math.round(params.similarityThreshold * 100)}% similarity)`,
    headerExecutor: (headers, params) => {
        if (!headers.includes('_similarity_group')) {
            return [...headers, '_similarity_group'];
        }
        return headers;
    },
    rowExecutor: (row, params) => {
        if (!row._similarity_group) {
            row._similarity_group = '';
        }
        return row;
    },
  },

  'column_level_deduplication': {
    name: 'Column-Level Deduplication',
    description: 'Remove duplicate values within a single column while keeping the row intact.',
    isPremium: true,
    icon: 'FaLayerGroup',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      keep: z.enum(['first', 'last', 'none']).default('first'),
      emptyAction: z.enum(['keep', 'remove']).default('keep'),
    }),
    getDetails: (params) => `Remove duplicate values in "${params.column}" column`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params, headers, context = {}) => {
      return row;
    },
  },

  'handle_mismatched_types': {
    name: 'Handle Mismatched Data',
    description: 'Fix rows that do not match the expected data type.',
    isPremium: true,
    icon: 'FaMagic',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      expectedType: z.enum(['email', 'number', 'date', 'url', 'phone']),
      action: z.enum(['clear_cell', 'remove_row']),
    }),
    getDetails: (params) => `In "${params.column}", ${params.action === 'clear_cell' ? 'clear cells' : 'remove rows'} that aren't a valid ${params.expectedType}`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (params.action !== 'clear_cell') return row;
      
      const value = row[params.column];
      if (!value) return row;
      
      const strValue = String(value).trim();
      let isValid = false;
      
      switch (params.expectedType) {
        case 'email':
          isValid = isEmail(strValue);
          break;
        case 'number':
          isValid = !isNaN(parseFloat(strValue)) && isFinite(parseFloat(strValue));
          break;
        case 'date':
          isValid = detectDateFormat(strValue) !== null;
          break;
        case 'url':
          isValid = isURL(strValue);
          break;
        case 'phone':
          const country = detectPhoneCountry(strValue);
          try {
            const phoneNumber = parsePhoneNumberFromString(strValue, country);
            isValid = phoneNumber ? phoneNumber.isValid() : false;
          } catch {
            isValid = false;
          }
          break;
      }
      
      if (!isValid) {
        row[params.column] = '';
      }
      return row;
    },
    rowFilter: (row, params) => {
      if (params.action !== 'remove_row') return true;
      
      const value = row[params.column];
      if (!value) return true;
      
      const strValue = String(value).trim();
      let isValid = false;
      
      switch (params.expectedType) {
        case 'email':
          isValid = isEmail(strValue);
          break;
        case 'number':
          isValid = !isNaN(parseFloat(strValue)) && isFinite(parseFloat(strValue));
          break;
        case 'date':
          isValid = detectDateFormat(strValue) !== null;
          break;
        case 'url':
          isValid = isURL(strValue);
          break;
        case 'phone':
          const country = detectPhoneCountry(strValue);
          try {
            const phoneNumber = parsePhoneNumberFromString(strValue, country);
            isValid = phoneNumber ? phoneNumber.isValid() : false;
          } catch {
            isValid = false;
          }
          break;
      }
      
      return isValid;
    },
  },

  // === ADVANCED TEXT PROCESSING ===
  'find_and_replace': {
    name: 'Find and Replace',
    description: 'Find and replace text within a column (case-insensitive).',
    isPremium: true,
    icon: 'FaSearch',
    schema: z.object({
      column: z.string({ required_error: 'Please select a column.' }),
      find: z.string().min(1, 'Find text cannot be empty.'),
      replace: z.string().default(''),
    }),
    getDetails: (params) => `In "${params.column}", replace "${params.find}" with "${params.replace}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column] && typeof row[params.column] === 'string') {
        const regex = new RegExp(params.find, 'gi');
        row[params.column] = row[params.column].replace(regex, params.replace);
      }
      return row;
    },
  },

  'remove_html': {
    name: 'Remove HTML Tags',
    description: 'Strip out all HTML tags from text.',
    isPremium: true,
    icon: 'FaCode',
    schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
    getDetails: (params) => `Strip HTML tags from "${params.column}"`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) row[params.column] = removeHtml(row[params.column]);
      return row;
    },
  },

  'convert_to_slug': {
    name: 'Convert to Slug',
    description: 'Convert text to a URL-friendly format.',
    isPremium: true,
    icon: 'FaLink',
    schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
    getDetails: (params) => `Convert "${params.column}" to a URL-friendly slug`,
    headerExecutor: (headers) => headers,
    rowExecutor: (row, params) => {
      if (row[params.column]) row[params.column] = slugify(row[params.column]);
      return row;
    },
  },

  'extract_domain': {
    name: 'Extract Domain from URL',
    description: 'Extract domain name from URLs.',
    isPremium: true,
    icon: 'FaGlobe',
    schema: z.object({ 
      column: z.string({ required_error: 'Please select a column.' }) 
    }),
    getDetails: (params) => `Extract domain from "${params.column}"`,
    headerExecutor: (headers, params) => [...headers, `${params.column}_domain`],
    rowExecutor: (row, params) => {
      if (row[params.column]) {
        row[`${params.column}_domain`] = extractDomain(row[params.column]);
      }
      return row;
    },
  },
};