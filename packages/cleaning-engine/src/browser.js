import { runEngine, getAvailableOperations, validateOperations, getOperationInfo, isOperationAvailable, optimizeOperationSequence, validateOperationSequence } from './index.js';
import { 
  cleanHeaders, 
  toTitleCase, 
  toSentenceCase, 
  toSmartCase, 
  slugify, 
  removeHtml, 
  cleanNumber, 
  formatDate, 
  formatPostalCode, 
  formatPhoneNumber, 
  detectCountry,
  isValidPhoneNumber,
  extractAreaCode
} from './utils/helpers.js';
import { operations } from './operations.js';
import { 
  findSimilarRows,
  findSimilarValues,
  similarityScore,
  advancedSimilarity
} from './utils/similarity.js';

// Export everything the frontend needs
export {
  runEngine,
  cleanHeaders,
  operations,
  getAvailableOperations,
  validateOperations,
  getOperationInfo,
  isOperationAvailable,
  optimizeOperationSequence,
  validateOperationSequence,
  toTitleCase,
  toSentenceCase,
  toSmartCase,
  slugify,
  removeHtml,
  cleanNumber,
  formatDate,
  formatPostalCode,
  formatPhoneNumber,
  detectCountry,
  isValidPhoneNumber,
  extractAreaCode,
  findSimilarRows,        
  findSimilarValues,         
  similarityScore,           
  advancedSimilarity
};

export default {
  runEngine,
  cleanHeaders,
  operations,
  getAvailableOperations
};