/**
 * Takes an array of potentially messy header strings and cleans them.
 * 1. Converts to a URL-friendly "slug" format (lowercase, underscores).
 * 2. Fills in empty headers with a default name.
 * 3. Ensures all header names are unique by appending '_2', '_3', etc.
 *
 * @param {string[]} headers - The array of original header names.
 * @returns {string[]} The array of cleaned, unique header names.
 */
export const cleanHeaders = (headers) => {
    const seen = new Map();
    
    return headers.map((header, index) => {
        // Step 1: Handle empty or null headers first
        let cleanedHeader = (header || `empty_column_${index + 1}`).toString().trim();

        // Step 2: Slugify the header (convert spaces to underscores, lowercase, etc.)
        // We modify the existing slugify to replace dashes with underscores for a more traditional header format.
        cleanedHeader = cleanedHeader
            .toLowerCase()
            .replace(/\s+/g, '_')       // Replace spaces with underscores
            .replace(/[^\w_]+/g, '')    // Remove all non-word chars except underscores
            .replace(/__+/g, '_');      // Replace multiple _ with single _

        // If after cleaning it's empty, give it a default name
        if (!cleanedHeader) {
            cleanedHeader = `column_${index + 1}`;
        }
        
        // Step 3: Ensure uniqueness
        if (seen.has(cleanedHeader)) {
            let count = seen.get(cleanedHeader) + 1;
            seen.set(cleanedHeader, count);
            const newHeader = `${cleanedHeader}_${count}`;
            seen.set(newHeader, 1); // Also add the new unique header to the map
            return newHeader;
        } else {
            seen.set(cleanedHeader, 1);
            return cleanedHeader;
        }
    });
};

/**
 * Converts a string to Title Case.
 * e.g., "hello world" -> "Hello World"
 */
export const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

/**
 * Convert to sentence case (first letter uppercase, rest lowercase)
 */
export const toSentenceCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Smart case conversion - detects proper nouns
 */
export const toSmartCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    // Common proper nouns that should stay capitalized
    const properNouns = new Set([
        'usa', 'uk', 'usd', 'gbp', 'eur', 'inc', 'llc', 'corp',
        'mr', 'mrs', 'ms', 'dr', 'prof', 'ceo', 'cfo', 'cto'
    ]);
    
    return str
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            // Always capitalize first word
            if (index === 0) return toTitleCase(word);
            // Capitalize proper nouns
            if (properNouns.has(word.toLowerCase())) return word.toUpperCase();
            // Capitalize words that are all caps (acronyms)
            if (word === word.toUpperCase()) return word;
            // Lowercase everything else
            return word.toLowerCase();
        })
        .join(' ');
};

/**
 * Converts a string into a URL-friendly slug.
 * e.g., "My Post Title!" -> "my-post-title"
 */
export const slugify = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
};

/**
 * Strips HTML tags from a string.
 * e.g., "<p>Hello</p>" -> "Hello"
 */
export const removeHtml = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.toString().replace(/<[^>]*>/g, '');
};

/**
 * Removes common non-numeric characters from a string, preserving numbers, dots, commas, and hyphens.
 * e.g., "$1,234.56" -> "1,234.56"
 */
export const cleanNumber = (val) => {
    if (!val) return val;
    return String(val).replace(/[^\d.,-]/g, '');
};

/**
 * Attempts to format a date string into a specified format. Returns original value on failure.
 * @param {string|Date} date - The date to format.
 * @param {string} format - The target format ('YYYY-MM-DD' or 'MM/DD/YYYY').
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return date;
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date; // Return original if invalid date

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return format === 'MM/DD/YYYY' ? `${month}/${day}/${year}` : `${year}-${month}-${day}`;
    } catch {
        return date; // Return original on any error
    }
};

/**
 * Enhanced postal code formatting with auto-correction
 * Supports multiple countries and common format errors
 */
export const formatPostalCode = (postalCode, country = 'US') => {
    if (!postalCode) return postalCode;
    
    const code = String(postalCode).trim().toUpperCase();
    const autoCountry = country === 'auto' ? detectCountry(code) : country;
    
    switch (autoCountry.toUpperCase()) {
        case 'US':
            // Handle US ZIP codes: 12345 or 12345-6789
            const cleanUS = code.replace(/[^\d-]/g, '');
            if (cleanUS.length === 5) return cleanUS;
            if (cleanUS.length === 9) return `${cleanUS.slice(0, 5)}-${cleanUS.slice(5)}`;
            if (cleanUS.length === 10 && cleanUS.includes('-')) return cleanUS;
            break;
            
        case 'CA':
            // Handle Canadian postal codes: A1A 1A1
            const cleanCA = code.replace(/[^\w]/g, '').toUpperCase();
            if (cleanCA.length === 6) {
                return `${cleanCA.slice(0, 3)} ${cleanCA.slice(3)}`;
            }
            break;
            
        case 'UK':
            // Handle UK postcodes: AA1A 1AA
            const cleanUK = code.replace(/[^\w]/g, '').toUpperCase();
            if (cleanUK.length >= 5 && cleanUK.length <= 7) {
                const outward = cleanUK.slice(0, -3);
                const inward = cleanUK.slice(-3);
                return `${outward} ${inward}`;
            }
            break;
    }
    
    return code; // Return original if no formatting applied
};

/**
 * Auto-detect country from phone or postal code patterns
 */
export const detectCountry = (value) => {
    if (!value) return 'US';
    
    const str = String(value);
    
    // US ZIP code pattern
    if (str.match(/^\d{5}(-\d{4})?$/)) return 'US';
    
    // Canadian postal code pattern
    if (str.match(/^[A-Z]\d[A-Z] \d[A-Z]\d$/i)) return 'CA';
    
    // UK postcode pattern
    if (str.match(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i)) return 'UK';
    
    // US phone pattern
    if (str.match(/^\+?1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/)) return 'US';
    
    return 'US'; // Default to US
};

/**
 * Enhanced phone number processing with auto-detection and validation
 */
export const formatPhoneNumber = (phone, country = 'auto') => {
    if (!phone) return phone;
    
    try {
        const phoneStr = String(phone).trim();
        
        // Auto-detect country if not specified
        const detectedCountry = country === 'auto' ? detectCountry(phoneStr) : country;
        
        const phoneNumber = parsePhoneNumberFromString(phoneStr, detectedCountry);
        
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('INTERNATIONAL');
        }
        
        // Fallback: Basic cleaning for invalid numbers
        return phoneStr.replace(/[^\d+]/g, '').replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
        
    } catch (error) {
        return phone; // Return original on error
    }
};

/**
 * Extract area code from phone number
 */
export const extractAreaCode = (phone, country = 'US') => {
    if (!phone) return '';
    
    try {
        const phoneNumber = parsePhoneNumberFromString(String(phone), country);
        if (phoneNumber && phoneNumber.isValid()) {
            const national = phoneNumber.formatNational();
            // Extract area code from US format: (123) 456-7890
            const areaCodeMatch = national.match(/\((\d{3})\)/);
            return areaCodeMatch ? areaCodeMatch[1] : '';
        }
    } catch (error) {
        // Silent fail - return empty string
    }
    
    return '';
};

/**
 * Validate phone number without formatting
 */
export const isValidPhoneNumber = (phone, country = 'US') => {
    if (!phone) return false;
    
    try {
        const phoneNumber = parsePhoneNumberFromString(String(phone), country);
        return phoneNumber ? phoneNumber.isValid() : false;
    } catch (error) {
        return false;
    }
};