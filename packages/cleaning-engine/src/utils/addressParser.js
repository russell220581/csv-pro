import { normalizeUnicode } from "./helpers.js";

/**
 * Parse address using comprehensive regex patterns
 * @param {string} address - Raw address text
 * @returns {Promise<{components:Object, confidence:number}>}
 */
export const parseAddress = async (address = "") => {
  if (!address || typeof address !== "string") {
    return { components: {}, confidence: 0 };
  }

  const value = normalizeUnicode(address.trim());
  const components = {};
  
  // Comprehensive international address patterns
  const patterns = {
    // House numbers (international formats)
    house_number: /\b(\d+[a-zA-Z]?(-\d+[a-zA-Z]?)?)\b/,
    
    // Street names (multilingual support)
    road: /\b(?:st(reet)?|rd|road|ave(nue)?|blvd|boulevard|ln|lane|dr(ive)?|way|pl(ace)?|sq(uare)?|ct|court)\s+([^,]+)/i,
    
    // City names (handles unicode for international cities)
    city: /,\s*([^,\d]+?)(?=,|\s*(?:\d{4,}|[A-Z]{2,}\b))/i,
    
    // State/Province (international)
    state: /\b(?:[A-Z]{2,}|(?:alberta|british columbia|manitoba|ontario|quebec|saskatchewan|california|texas|florida|new york|england|scotland|wales|northern ireland))\b/i,
    
    // Postal codes (international formats)
    postcode: /\b(\d{4,6}(?:-\d{4})?|[A-Z]\d[A-Z] ?\d[A-Z]\d|[A-Z]{1,2}\d{1,2} ?\d{1,2}[A-Z]{2})\b/i,
    
    // Countries (common names)
    country: /\b(?:united states|usa|canada|uk|united kingdom|australia|germany|france|italy|spain|japan|china|india|brazil|mexico)\b/i
  };

  // Extract components using patterns
  let extractedCount = 0;
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = value.match(pattern);
    if (match) {
      components[key] = (match[1] || match[0]).trim();
      extractedCount++;
    }
  }

  // Fallback: intelligent comma-based parsing for unstructured addresses
  if (extractedCount < 2) {
    const parts = value.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    if (parts.length >= 2) {
      // First part often contains street address
      const firstPart = parts[0];
      const numberMatch = firstPart.match(patterns.house_number);
      if (numberMatch) {
        components.house_number = numberMatch[0];
        components.road = firstPart.replace(numberMatch[0], '').trim();
      } else {
        components.road = firstPart;
      }
      
      // Middle parts often contain city
      if (parts.length >= 2) {
        components.city = parts[1];
      }
      
      // Last part often contains postal code or state
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(patterns.postcode)) {
          components.postcode = lastPart;
        } else if (lastPart.match(patterns.state)) {
          components.state = lastPart;
        } else if (lastPart.match(patterns.country)) {
          components.country = lastPart;
        }
      }
    }
  }

  // Confidence calculation based on extracted components
  const importantKeys = ["road", "city", "postcode"];
  const confidence = importantKeys.filter(k => components[k] && components[k].length > 0).length / importantKeys.length;

  return { components, confidence };
};

/**
 * Format parsed address components intelligently
 */
export const formatParsedAddress = (parsed = {}) => {
  const parts = [];
  
  // Build address in logical order
  if (parsed.house_number && parsed.road) {
    parts.push(`${parsed.house_number} ${parsed.road}`);
  } else if (parsed.road) {
    parts.push(parsed.road);
  }
  
  if (parsed.city) parts.push(parsed.city);
  if (parsed.state) parts.push(parsed.state);
  if (parsed.postcode) parts.push(parsed.postcode);
  if (parsed.country) parts.push(parsed.country);

  return parts.length > 0 ? parts.join(", ") : "";
};

export default { parseAddress, formatParsedAddress };