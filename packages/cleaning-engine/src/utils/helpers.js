import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { parse, isValid, format, parseISO } from 'date-fns';
import numbro from 'numbro';
import pkg from 'validator';
const { isPostalCode } = pkg;

/* -----------------------------------------------------------
   GLOBAL DATA NORMALIZATION & PARSING
----------------------------------------------------------- */

/**
 * Universal Unicode normalization with locale awareness
 */
export const normalizeUnicode = (str = "", locale = "en") => {
  if (typeof str !== 'string') return str;
  
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\p{Z}/gu, " ")         // Normalize all space types
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '') // Keep letters, numbers, punctuation, spaces
    .trim();
};

/**
 * Detect text language/script for better processing
 */
export const detectScript = (text) => {
  if (!text) return 'latin';
  
  const str = String(text);
  
  // Common script detection
  if (/[\u4e00-\u9fff]/.test(str)) return 'chinese';
  if (/[\u3040-\u309f]/.test(str)) return 'hiragana';
  if (/[\u30a0-\u30ff]/.test(str)) return 'katakana';
  if (/[\uac00-\ud7af]/.test(str)) return 'korean';
  if (/[\u0600-\u06ff]/.test(str)) return 'arabic';
  if (/[\u0400-\u04ff]/.test(str)) return 'cyrillic';
  if (/[\u0900-\u097f]/.test(str)) return 'devanagari';
  
  return 'latin';
};

/* -----------------------------------------------------------
   SMART HEADER CLEANER WITH INTERNATIONAL SUPPORT
----------------------------------------------------------- */
export const cleanHeaders = (headers) => {
  const seen = new Map();
  
  // Global header patterns with multilingual support
  const globalPatterns = {
    // Personal information
    'first[_\s]?name|fname|givenname|prenom|vorname|nombre': 'first_name',
    'last[_\s]?name|lname|surname|familyname|nom|familienname|apellido': 'last_name', 
    'full[_\s]?name|name|contactname|nomcomplet|vollständigername|nombrecompleto': 'full_name',
    'email[_\s]?address|e-mail|mail|courriel|correo': 'email',
    'phone|telephone|mobile|contactnumber|téléphone|mobil|teléfono': 'phone',
    'address|streetaddress|location|adresse|dirección': 'address',
    
    // Identifiers
    'id|identifier|userid|customerid|identifiant|identificación': 'id',
    'username|login|user_name|nomdutilisateur|usuario': 'username',
    
    // Dates
    'date|timestamp|created|modified|fecha|datum': 'date',
    'birthdate|dob|dateofbirth|datedenaissance|geburtstag|fechanacimiento': 'birth_date',
    'registrationdate|signupdate|dateinscription|fecharegistro': 'registration_date',
    
    // Location
    'city|town|municipality|ville|stadt|ciudad': 'city',
    'state|province|region|état|bundesland|estado': 'state',
    'zip|postalcode|postcode|pincode|codepostal|plz|codigopostal': 'postal_code',
    'country|nation|pays|land|país': 'country',
    
    // Financial
    'price|cost|amount|prix|preis|precio': 'price',
    'total|sum|amount_total|total|gesamt|total': 'total',
    'currency|ccy|devise|währung|moneda': 'currency',
    
    // URLs and digital
    'url|website|link|site|webseite|sitio': 'url',
    'ipaddress|ip|adresseip|direccionip': 'ip_address'
  };

  return headers.map((header, index) => {
    let cleanedHeader = (header || `column_${index + 1}`).toString().trim();
    if (!cleanedHeader) return `column_${index + 1}`;

    // Step 1: Check for global patterns
    let matchedPattern = false;
    for (const [pattern, standardized] of Object.entries(globalPatterns)) {
      const regex = new RegExp(pattern, 'i');
      if (cleanedHeader && regex.test(cleanedHeader)) {
        cleanedHeader = standardized;
        matchedPattern = true;
        break;
      }
    }

    if (!matchedPattern) {
      // Step 2: Normalize and clean the header
      cleanedHeader = normalizeUnicode(cleanedHeader)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w_]+/g, "")
        .replace(/__+/g, "_");
    }

    if (!cleanedHeader) cleanedHeader = `column_${index + 1}`;

    // Step 3: Handle duplicates
    if (seen.has(cleanedHeader)) {
      let count = seen.get(cleanedHeader) + 1;
      seen.set(cleanedHeader, count);
      const newHeader = `${cleanedHeader}_${count}`;
      seen.set(newHeader, 1);
      return newHeader;
    } else {
      seen.set(cleanedHeader, 1);
      return cleanedHeader;
    }
  });
};

/* -----------------------------------------------------------
   INTERNATIONAL TEXT CASE HANDLING
----------------------------------------------------------- */
export const toTitleCase = (str, locale = "en") => {
  if (typeof str !== "string") return str;
  
  const script = detectScript(str);
  
  // Script-specific handling
  if (script !== 'latin') {
    return normalizeUnicode(str); // Return normalized for non-Latin scripts
  }
  
  return normalizeUnicode(str).replace(/\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const toSentenceCase = (str, locale = "en") => {
  if (!str || typeof str !== "string") return str;
  const s = normalizeUnicode(str).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const toSmartCase = (str, locale = "en") => {
  if (!str || typeof str !== "string") return str;
  
  const script = detectScript(str);
  if (script !== 'latin') return normalizeUnicode(str);
  
  const properNouns = new Set([
    // International proper nouns
    "usa","uk","us","gb","eu","un","who","unicef","nato","cia","fbi",
    "nyc","la","sf","london","paris","tokyo","beijing","moscow",
    "ibm","microsoft","apple","google","amazon","sony","samsung",
    "mr","mrs","ms","dr","prof","ceo","cfo","cto",
    "id","url","ip","sku","api","http","https","www"
  ]);

  return normalizeUnicode(str)
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i === 0) return toTitleCase(word);
      if (properNouns.has(word)) return word.toUpperCase();
      if (word === word.toUpperCase()) return word;
      return word.toLowerCase();
    })
    .join(" ");
};

/* -----------------------------------------------------------
   INTERNATIONAL PHONE NUMBER PROCESSING
----------------------------------------------------------- */
export const detectPhoneCountry = (phoneNumber) => {
  if (!phoneNumber) return 'US';
  
  const phoneStr = String(phoneNumber).trim();
  
  // Country code detection
  if (phoneStr.startsWith('+1') || phoneStr.startsWith('1 ') || /^\d{10}$/.test(phoneStr.replace(/\D/g, ''))) return 'US';
  if (phoneStr.startsWith('+44') || phoneStr.startsWith('0') && phoneStr.length > 9) return 'GB';
  if (phoneStr.startsWith('+33') || phoneStr.startsWith('0') && phoneStr.length === 10) return 'FR';
  if (phoneStr.startsWith('+49') || phoneStr.startsWith('0') && phoneStr.length >= 10) return 'DE';
  if (phoneStr.startsWith('+34') || phoneStr.startsWith('6') || phoneStr.startsWith('7')) return 'ES';
  if (phoneStr.startsWith('+39') || phoneStr.startsWith('3')) return 'IT';
  if (phoneStr.startsWith('+81')) return 'JP';
  if (phoneStr.startsWith('+86')) return 'CN';
  if (phoneStr.startsWith('+91')) return 'IN';
  if (phoneStr.startsWith('+55')) return 'BR';
  if (phoneStr.startsWith('+7')) return 'RU';
  if (phoneStr.startsWith('+61')) return 'AU';
  if (phoneStr.startsWith('+64')) return 'NZ';
  
  // Fallback to US for unknown formats
  return 'US';
};

export const formatPhoneNumber = (phone, country = "auto", formatType = "INTERNATIONAL") => {
  if (!phone) return phone;
  
  try {
    const detectedCountry = country === "auto" ? detectPhoneCountry(phone) : country;
    const phoneStr = String(phone).trim();
    
    // Clean the phone number
    let cleanPhone = phoneStr.replace(/[^\d+]/g, "");
    
    // Handle double plus signs and common prefixes
    if (cleanPhone.startsWith('++')) {
      cleanPhone = '+' + cleanPhone.slice(2);
    }
    
    // Add country code if missing for national numbers
    if (!cleanPhone.startsWith('+') && detectedCountry !== 'US') {
      // This is complex for international numbers, better to use libphonenumber
      const phoneNumber = parsePhoneNumberFromString(cleanPhone, detectedCountry);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format(formatType);
      }
    }
    
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, detectedCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      switch (formatType) {
        case 'E.164': return phoneNumber.format('E.164');
        case 'NATIONAL': return phoneNumber.formatNational();
        case 'INTERNATIONAL': 
        default: return phoneNumber.formatInternational();
      }
    }
    
    // Fallback: Basic formatting
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length >= 10) {
      if (digits.length === 10) {
        return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      } else if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
      }
      return `+${digits}`;
    }
    
    return phoneStr;
  } catch {
    return phone;
  }
};

export const isValidPhoneNumber = (phone, country = "auto") => {
  if (!phone) return false;
  
  try {
    const detectedCountry = country === "auto" ? detectPhoneCountry(phone) : country;
    const phoneNumber = parsePhoneNumberFromString(String(phone), detectedCountry);
    return phoneNumber ? phoneNumber.isValid() : false;
  } catch {
    return false;
  }
};

export const extractAreaCode = (phone, country = "auto") => {
  if (!phone) return "";
  
  try {
    const detectedCountry = country === "auto" ? detectPhoneCountry(phone) : country;
    const phoneNumber = parsePhoneNumberFromString(String(phone), detectedCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      // Area code extraction varies by country
      const national = phoneNumber.formatNational();
      const match = national.match(/\((\d{2,4})\)/);
      return match ? match[1] : "";
    }
  } catch {
    // Ignore errors
  }
  return "";
};

/* -----------------------------------------------------------
   INTERNATIONAL DATE PROCESSING
----------------------------------------------------------- */
export const detectDateFormat = (dateStr) => {
  if (!dateStr) return null;
  
  const str = String(dateStr).trim();
  
  // Common global date patterns
  const patterns = [
    { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'yyyy-MM-dd' }, // ISO
    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/dd/yyyy' }, // US
    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'dd/MM/yyyy' }, // European
    { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'dd-MM-yyyy' }, // European
    { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'dd.MM.yyyy' }, // German
    { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'yyyy/MM/dd' }, // Asian
    { regex: /^\d{2}\/\d{2}\/\d{2}$/, format: 'MM/dd/yy' }, // Short year
    { regex: /^\d{8}$/, format: 'yyyyMMdd' }, // Compact
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(str)) {
      return pattern.format;
    }
  }
  
  return null;
};

export const formatDate = (date, outputFormat = "yyyy-MM-dd", locale = "en") => {
  if (!date) return date;
  
  try {
    const dateStr = String(date).trim();
    const detectedFormat = detectDateFormat(dateStr);
    
    let parsedDate;
    
    if (detectedFormat) {
      parsedDate = parse(dateStr, detectedFormat, new Date());
    } else {
      // Try ISO parsing
      parsedDate = parseISO(dateStr);
      if (!isValid(parsedDate)) {
        // Fallback to native Date
        parsedDate = new Date(dateStr);
      }
    }
    
    if (isValid(parsedDate)) {
      return format(parsedDate, outputFormat);
    }
    
    return dateStr; // Return original if can't parse
  } catch {
    return date;
  }
};

/* -----------------------------------------------------------
   INTERNATIONAL POSTAL CODE PROCESSING
----------------------------------------------------------- */
export const detectPostalCodeCountry = (postalCode) => {
  if (!postalCode) return 'US';
  
  const code = String(postalCode).toUpperCase().trim();
  
  // Country detection based on patterns
  if (/^\d{5}(-\d{4})?$/.test(code)) return 'US';
  if (/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(code)) return 'CA';
  if (/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(code)) return 'GB';
  if (/^\d{5}$/.test(code)) return 'DE';
  if (/^\d{4}$/.test(code)) return 'AU'; // Australia
  if (/^\d{4}?$/.test(code)) return 'NZ'; // New Zealand
  if (/^\d{5}$/.test(code)) return 'FR';
  if (/^\d{5}$/.test(code)) return 'ES';
  if (/^\d{5}$/.test(code)) return 'IT';
  if (/^\d{3} ?\d{2}$/.test(code)) return 'SE'; // Sweden
  if (/^\d{4}$/.test(code)) return 'NO'; // Norway
  if (/^\d{4}$/.test(code)) return 'DK'; // Denmark
  if (/^\d{5}$/.test(code)) return 'IN'; // India
  if (/^\d{6}$/.test(code)) return 'CN'; // China
  if (/^\d{3}-\d{4}$/.test(code)) return 'JP'; // Japan
  if (/^\d{5}$/.test(code)) return 'RU'; // Russia
  if (/^\d{5}$/.test(code)) return 'BR'; // Brazil
  
  return 'US'; // Default fallback
};

export const formatPostalCode = (postalCode, country = "auto") => {
  if (!postalCode) return postalCode;
  
  const detectedCountry = country === "auto" ? detectPostalCodeCountry(postalCode) : country;
  const code = String(postalCode).toUpperCase().trim().replace(/\s+/g, '');
  
  try {
    // Use validator.js for validation
    if (isPostalCode(code, detectedCountry)) {
      // Format based on country standards
      switch (detectedCountry) {
        case 'US':
          return code.length === 9 ? `${code.slice(0,5)}-${code.slice(5)}` : code;
        case 'CA':
          return code.length === 6 ? `${code.slice(0,3)} ${code.slice(3)}` : code;
        case 'GB':
          return code.length > 3 ? `${code.slice(0, -3)} ${code.slice(-3)}` : code;
        case 'JP':
          return code.length === 7 ? `${code.slice(0,3)}-${code.slice(3)}` : code;
        default:
          return code;
      }
    }
    
    return code; // Return original if invalid
  } catch {
    return postalCode;
  }
};

/* -----------------------------------------------------------
   INTERNATIONAL CURRENCY & NUMBER PROCESSING
----------------------------------------------------------- */
export const detectCurrency = (value) => {
  if (!value) return 'USD';
  
  const str = String(value);
  
  // Currency symbol detection
  if (str.includes('$')) return 'USD';
  if (str.includes('€')) return 'EUR';
  if (str.includes('£')) return 'GBP';
  if (str.includes('¥')) return 'JPY';
  if (str.includes('₹')) return 'INR';
  if (str.includes('₩')) return 'KRW';
  if (str.includes('₽')) return 'RUB';
  if (str.includes('R$')) return 'BRL';
  if (str.includes('C$')) return 'CAD';
  if (str.includes('A$')) return 'AUD';
  
  return 'USD'; // Default
};

export const cleanNumber = (val, locale = "en-US") => {
  if (val == null) return val;
  
  const raw = normalizeUnicode(String(val));
  
  try {
    // Remove all currency symbols and thousands separators
    const sanitized = raw
      .replace(/[\$\€\£\¥\₹\₩\₽]/g, '') // Remove currency symbols
      .replace(/[^\d,.-]/g, '') // Keep only digits, comma, dot, minus
      .replace(/,/g, ''); // Remove commas (assuming they're thousands separators)
    
    const parsed = parseFloat(sanitized);
    if (typeof parsed === "number" && !isNaN(parsed)) return parsed;
    
    return null;
  } catch {
    return null;
  }
};

export const formatCurrency = (value, currency = "auto", locale = "en-US") => {
  if (value == null) return value;
  
  const detectedCurrency = currency === "auto" ? detectCurrency(String(value)) : currency;
  const number = cleanNumber(value);
  
  if (number !== null) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: detectedCurrency,
      }).format(number);
    } catch {
      // Fallback if currency is not supported
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
      }).format(number);
    }
  }
  
  return value;
};

/* -----------------------------------------------------------
   MISC TEXT PROCESSING
----------------------------------------------------------- */
export const slugify = (text) => {
  return typeof text === "string"
    ? normalizeUnicode(text)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
    : text;
};

export const removeHtml = (text) => {
  return typeof text === "string" ? text.replace(/<[^>]*>/g, "") : text;
};

export const extractDomain = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};