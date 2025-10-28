import { z } from 'zod';
import { toTitleCase, slugify, removeHtml, cleanNumber, formatDate, toSentenceCase, toSmartCase, formatPostalCode, formatPhoneNumber, extractAreaCode } from './utils/helpers.js';
import { findSimilarRows, findSimilarValues, advancedSimilarity } from './utils/similarity.js';
import { dataValidationSchemas } from './utils/schemas.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import postalCodes from 'postal-codes-js';


export const operations = {
    // --- FREE TIER OPERATIONS ---
    'standardize_headers': {
        name: 'Standardize Headers',
        description: 'Clean and standardize all column headers automatically.',
        isPremium: false,
        icon: 'FaColumns',
        schema: z.object({}), // No parameters needed
        getDetails: () => 'Standardize all column headers',
        headerExecutor: (headers) => {
            // Use your existing cleanHeaders function
            return cleanHeaders(headers);
        },
        rowExecutor: null, // This only affects headers, not row data
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

    'trim_whitespace': {
        name: 'Trim Whitespace',
        description: 'Remove spaces from the beginning and end of text.',
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
                // Trim ALL columns
                Object.keys(row).forEach(column => {
                    if (row[column] && typeof row[column] === 'string') {
                        row[column] = row[column].trim();
                    }
                });
            } else if (row[params.column]) {
                // Trim specific column
                row[params.column] = String(row[params.column]).trim();
            }
            return row;
        },
    },

    'trim_whitespace_all': {
        name: 'Trim All Whitespace',
        description: 'Remove spaces from beginning and end of ALL columns automatically.',
        isPremium: false,
        icon: 'FaBroom',
        schema: z.object({}), // No parameters needed
        getDetails: () => 'Trim whitespace from all columns',
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params, headers) => {
            // Trim every column in the row
            Object.keys(row).forEach(column => {
                if (row[column] && typeof row[column] === 'string') {
                    row[column] = row[column].trim();
                }
            });
            return row;
        },
    },

    'remove_empty_rows': {
        name: 'Remove Empty Rows',
        description: 'Delete rows where every cell is empty.',
        isPremium: false,
        icon: 'FaFilter',
        schema: z.object({}),
        getDetails: () => 'Delete all completely blank rows',
        headerExecutor: (headers) => headers,
        rowFilter: (row, params, headers) => !headers.every(h => !row[h] || String(row[h]).trim() === ''),
    },

    'format_email': {
        name: 'Format Emails',
        description: 'Standardize email formatting (lowercase, trimmed).',
        isPremium: false,
        icon: 'FaEnvelope',
        schema: z.object({ column: z.string({ required_error: 'Please select a column.' }) }),
        getDetails: (params) => `Format emails in "${params.column}"`,
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params) => {
            if (row[params.column]) row[params.column] = String(row[params.column]).trim().toLowerCase();
            return row;
        },
    },
    
    'format_name_titlecase': {
        name: 'Format to Title Case',
        description: 'Convert "john smith" to "John Smith".',
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

    'format_date': {
        name: 'Format Dates',
        description: 'Standardize dates to a consistent format.',
        isPremium: false,
        icon: 'FaCalendarAlt',
        schema: z.object({
            column: z.string({ required_error: 'Please select a column.' }),
            format: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY']),
        }),
        getDetails: (params) => `Format dates in "${params.column}" to ${params.format}`,
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params) => {
            if (row[params.column]) row[params.column] = formatDate(row[params.column], params.format);
            return row;
        },
    },
    
    'format_phone': {
        name: 'Format Phone Numbers',
        description: 'Standardize phone numbers into a consistent format.',
        isPremium: false,
        icon: 'FaPhoneAlt',
        schema: z.object({
            column: z.string({ required_error: 'Please select a column.' }),
            country: z.string().min(2).max(2, 'Country code must be 2 letters.'),
            format: z.enum(['E.164', 'NATIONAL', 'INTERNATIONAL']),
        }),
        getDetails: (params) => `Format phone numbers in "${params.column}"`,
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params) => {
            const phone = row[params.column];
            if (phone) {
                try {
                    const phoneNumber = parsePhoneNumberFromString(String(phone), params.country);
                    if (phoneNumber) {
                        row[params.column] = phoneNumber.format(params.format);
                    }
                } catch (error) { /* Leave original value on failure */ }
            }
            return row;
        },
    },

    'smart_format_phone': {
        name: 'Smart Phone Formatting',
        description: 'Automatically detect country and format phone numbers correctly.',
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

    'clean_numbers': {
        name: 'Clean Numbers',
        description: 'Remove currency symbols and other non-numeric characters.',
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

    'smart_format_postal_code': {
        name: 'Smart Postal Code Formatting',
        description: 'Automatically detect country and format postal codes correctly.',
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

    // --- PREMIUM TIER OPERATIONS ---
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
        rowFilter: null, // Logic is handled externally in the engine's stream/loop
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
        rowFilter: null, // Handled externally with custom logic
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
        headerExecutor: (headers) => {
            // Add a column to mark similar groups if highlighting
            return [...headers, '_similarity_group'];
        },
        rowExecutor: (row, params) => {
            // This is a placeholder - actual implementation requires batch processing
            // The real work happens in the analysis phase
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
            // This requires stateful processing across multiple rows
            // Implemented in the streaming engine
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
            expectedType: z.enum(['email', 'number', 'date', 'url']),
            action: z.enum(['clear_cell', 'remove_row']),
        }),
        getDetails: (params) => `In "${params.column}", ${params.action === 'clear_cell' ? 'clear cells' : 'remove rows'} that aren't a valid ${params.expectedType}`,
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params) => {
            if (params.action !== 'clear_cell') return row;
            const schema = dataValidationSchemas[params.expectedType];
            if (schema && row[params.column]) {
                if (!schema.safeParse(row[params.column]).success) {
                    row[params.column] = '';
                }
            }
            return row;
        },
        rowFilter: (row, params) => {
            if (params.action !== 'remove_row') return true;
            const schema = dataValidationSchemas[params.expectedType];
            if (schema && row[params.column]) {
                return schema.safeParse(row[params.column]).success;
            }
            return true;
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

    'validate_postal_code': {
        name: 'Validate Postal Codes',
        description: 'Check for valid postal codes. Clears invalid entries.',
        isPremium: true,
        icon: 'FaCheckSquare',
        schema: z.object({
            column: z.string({ required_error: 'Please select a column.' }),
            country: z.string().min(2).max(2),
        }),
        getDetails: (params) => `Validate postal codes in "${params.column}" for country ${params.country.toUpperCase()}`,
        headerExecutor: (headers) => headers,
        rowExecutor: (row, params) => {
            if (row[params.column]) {
                if (!postalCodes.validate(params.country.toUpperCase(), row[params.column])) {
                    row[params.column] = '';
                }
            }
            return row;
        },
    },

    'smart_case_conversion': {
        name: 'Smart Case Correction',
        description: 'Automatically fix mixed case text while preserving proper nouns.',
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

    'extract_address_components': {
        name: 'Extract Address Components',
        description: 'Split address into street, city, state, and zip code columns.',
        isPremium: true,
        icon: 'FaMap',
        schema: z.object({
            addressColumn: z.string({ required_error: 'Please select an address column.' }),
            country: z.string().min(2).max(2).default('US'),
        }),
        getDetails: (params) => `Split "${params.addressColumn}" into components`,
        headerExecutor: (headers, params) => {
            // Add new columns for address components
            return [...headers, 'street', 'city', 'state', 'zip_code'];
        },
        rowExecutor: (row, params) => {
            if (row[params.addressColumn]) {
                const address = String(row[params.addressColumn]);
                // Basic US address parsing - can be enhanced with libraries
                const usMatch = address.match(/(.+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(-\d{4})?)/i);
                if (usMatch) {
                    row['street'] = usMatch[1].trim();
                    row['city'] = usMatch[2].trim();
                    row['state'] = usMatch[3].toUpperCase();
                    row['zip_code'] = usMatch[4];
                }
            }
            return row;
        },
    },
};