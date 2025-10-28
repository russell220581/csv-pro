/**
 * Data enrichment utilities to add value to existing data
 */

/**
 * Extract domain from email address
 */
export const extractEmailDomain = (email) => {
    if (!email || typeof email !== 'string') return '';
    
    const emailStr = email.trim().toLowerCase();
    const atIndex = emailStr.indexOf('@');
    
    if (atIndex === -1) return '';
    return emailStr.slice(atIndex + 1);
};

/**
 * Extract username from email address
 */
export const extractEmailUsername = (email) => {
    if (!email || typeof email !== 'string') return '';
    
    const emailStr = email.trim().toLowerCase();
    const atIndex = emailStr.indexOf('@');
    
    if (atIndex === -1) return emailStr;
    return emailStr.slice(0, atIndex);
};

/**
 * Detect email provider type
 */
export const detectEmailProvider = (email) => {
    const domain = extractEmailDomain(email);
    if (!domain) return 'unknown';
    
    const providers = {
        'gmail.com': 'Google',
        'yahoo.com': 'Yahoo',
        'outlook.com': 'Microsoft',
        'hotmail.com': 'Microsoft',
        'aol.com': 'AOL',
        'icloud.com': 'Apple',
        'protonmail.com': 'ProtonMail',
        'zoho.com': 'Zoho'
    };
    
    return providers[domain] || 'other';
};

/**
 * Extract geographic information from postal code (US only)
 */
export const getGeoFromPostalCode = (postalCode) => {
    if (!postalCode) return null;
    
    const code = String(postalCode).replace(/[^\d]/g, '').slice(0, 5);
    if (code.length !== 5) return null;
    
    // Basic US geographic regions by ZIP code prefix
    const regions = {
        '0': 'Northeast', '01': 'Northeast', '02': 'Northeast', '03': 'Northeast',
        '04': 'Northeast', '05': 'Northeast', '06': 'Northeast', '07': 'Northeast',
        '08': 'Northeast', '09': 'Northeast', '1': 'Northeast', '10': 'Northeast',
        '2': 'Midwest', '3': 'Midwest', '4': 'Midwest', '5': 'Midwest', '6': 'Midwest',
        '7': 'South', '8': 'West', '9': 'West'
    };
    
    const prefix = code.charAt(0);
    const region = regions[prefix] || 'Unknown';
    
    return {
        region,
        timezone: getTimezoneFromRegion(region),
        area: getAreaFromZipPrefix(prefix)
    };
};

/**
 * Get timezone from region
 */
const getTimezoneFromRegion = (region) => {
    const timezones = {
        'Northeast': 'Eastern',
        'Midwest': 'Central',
        'South': 'Central',
        'West': 'Pacific'
    };
    return timezones[region] || 'Unknown';
};

/**
 * Get area from ZIP prefix
 */
const getAreaFromZipPrefix = (prefix) => {
    const areas = {
        '0': 'New England',
        '1': 'NY/PA/NJ',
        '2': 'DC/VA/MD/DE',
        '3': 'TN/NC/SC/GA/AL',
        '4': 'MI/IN/OH/KY',
        '5': 'IA/IL/MN/MO/WI',
        '6': 'TX/LA/AR/MS/OK/KS/NE',
        '7': 'FL/GA/AL/MS',
        '8': 'CO/UT/AZ/NV/NM/WY/MT/ID',
        '9': 'CA/OR/WA/AK/HI'
    };
    return areas[prefix] || 'Unknown';
};

/**
 * Extract name components from full name
 */
export const parseFullName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') {
        return { firstName: '', lastName: '', middleName: '' };
    }
    
    const name = fullName.trim();
    const parts = name.split(/\s+/);
    
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '', middleName: '' };
    }
    
    if (parts.length === 2) {
        return { firstName: parts[0], lastName: parts[1], middleName: '' };
    }
    
    // For 3+ parts, assume first is first name, last is last name, middle are middle names
    return {
        firstName: parts[0],
        lastName: parts[parts.length - 1],
        middleName: parts.slice(1, -1).join(' ')
    };
};

/**
 * Detect gender from first name (basic implementation)
 */
export const detectGenderFromName = (firstName) => {
    if (!firstName) return 'unknown';
    
    const name = firstName.toLowerCase().trim();
    
    // Common male names
    const maleNames = new Set([
        'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
        'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
        'donald', 'steven', 'paul', 'andrew', 'joshua', 'kevin', 'brian', 'george',
        'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary'
    ]);
    
    // Common female names
    const femaleNames = new Set([
        'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
        'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'sandra', 'margaret',
        'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'carol', 'amanda',
        'dorothy', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura'
    ]);
    
    if (maleNames.has(name)) return 'male';
    if (femaleNames.has(name)) return 'female';
    return 'unknown';
};

/**
 * Extract company from email domain
 */
export const extractCompanyFromEmail = (email) => {
    const domain = extractEmailDomain(email);
    if (!domain) return '';
    
    // Remove common domain extensions and return the company part
    const company = domain
        .replace(/\.(com|org|net|edu|gov|io|co|uk|ca|au)$/, '')
        .replace(/\./g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    
    return company;
};

/**
 * Calculate data quality score for a value
 */
export const calculateDataQualityScore = (value, type) => {
    if (!value || String(value).trim() === '') return 0;
    
    const strValue = String(value).trim();
    
    switch (type) {
        case 'email':
            return strValue.includes('@') && strValue.includes('.') ? 100 : 30;
            
        case 'phone':
            // Basic phone validation - at least 10 digits
            const digitCount = (strValue.match(/\d/g) || []).length;
            return digitCount >= 10 ? 100 : Math.min(digitCount * 10, 100);
            
        case 'name':
            // Name should have at least 2 characters and not be all uppercase
            if (strValue.length < 2) return 20;
            if (strValue === strValue.toUpperCase()) return 60; // All caps
            if (strValue === strValue.toLowerCase()) return 70; // All lowercase
            return 90; // Mixed case (probably proper)
            
        case 'postal_code':
            // US ZIP code validation
            if (strValue.match(/^\d{5}(-\d{4})?$/)) return 100;
            if (strValue.match(/^\d{5}$/)) return 90;
            return 50;
            
        default:
            return strValue.length > 0 ? 80 : 0;
    }
};

/**
 * Generate data enrichment report for a dataset
 */
export const generateEnrichmentReport = (data, headers) => {
    const report = {
        totalRows: data.length,
        enrichmentOpportunities: [],
        qualityScores: {}
    };
    
    // Check each column for enrichment opportunities
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val);
        const sampleValues = values.slice(0, 10);
        
        // Email enrichment
        if (header.toLowerCase().includes('email') && values.length > 0) {
            const domains = new Set(values.map(extractEmailDomain).filter(d => d));
            if (domains.size > 0) {
                report.enrichmentOpportunities.push({
                    column: header,
                    type: 'email_enrichment',
                    description: `Extract domains and providers from ${values.length} emails`,
                    domains: Array.from(domains).slice(0, 5)
                });
            }
        }
        
        // Name enrichment
        if (header.toLowerCase().includes('name') && values.length > 0) {
            report.enrichmentOpportunities.push({
                column: header,
                type: 'name_parsing',
                description: `Parse ${values.length} names into first/last components`
            });
        }
        
        // Postal code enrichment
        if ((header.toLowerCase().includes('zip') || header.toLowerCase().includes('postal')) && values.length > 0) {
            const validCodes = values.filter(v => String(v).match(/\d{5}/));
            if (validCodes.length > 0) {
                report.enrichmentOpportunities.push({
                    column: header,
                    type: 'geo_enrichment',
                    description: `Add geographic data for ${validCodes.length} postal codes`
                });
            }
        }
        
        // Calculate quality scores
        const qualityScores = values.map(val => calculateDataQualityScore(val, detectValueType(header)));
        const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
        
        report.qualityScores[header] = {
            average: Math.round(avgQuality),
            excellent: qualityScores.filter(s => s >= 90).length,
            good: qualityScores.filter(s => s >= 70 && s < 90).length,
            poor: qualityScores.filter(s => s < 70).length
        };
    });
    
    return report;
};

/**
 * Detect value type from column name
 */
const detectValueType = (columnName) => {
    const lower = columnName.toLowerCase();
    
    if (lower.includes('email')) return 'email';
    if (lower.includes('phone')) return 'phone';
    if (lower.includes('name')) return 'name';
    if (lower.includes('zip') || lower.includes('postal')) return 'postal_code';
    
    return 'text';
};