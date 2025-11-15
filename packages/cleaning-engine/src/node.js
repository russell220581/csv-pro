import { Transform } from "stream";
import { operations } from "./operations.js";
import { StreamingDuplicateDetector, ColumnDuplicateDetector } from './utils/similarity.js';

/**
 * Creates a Node.js Transform stream that applies a recipe of cleaning operations.
 * Enhanced with global data support and better error handling.
 */
export function createCleaningStream(recipe, initialHeaders) {
  let headers = [...initialHeaders];
  let headerMapping = {};

  console.log('=== GLOBAL CLEANING STREAM INIT ===');
  console.log('Initial headers:', initialHeaders);
  console.log('Recipe operations:', recipe.map(op => op.type));

  // Apply header-only operations first and track mapping
  for (const op of recipe) {
    const executor = operations[op.type]?.headerExecutor;
    if (executor) {
      try {
        console.log(`Applying header executor for: ${op.type}`);
        const oldHeaders = [...headers];
        const newHeaders = executor(headers, op.params);
        
        // Build accurate name-based mapping
        const newMapping = {};
        
        if (op.type === 'standardize_headers') {
          // For standardize_headers, map each old header to its new standardized version
          oldHeaders.forEach((oldHeader, index) => {
            newMapping[oldHeader] = newHeaders[index];
          });
        } else {
          // For other operations, preserve existing mappings
          Object.keys(headerMapping).forEach(oldHeader => {
            const currentHeader = headerMapping[oldHeader];
            if (newHeaders.includes(currentHeader)) {
              newMapping[oldHeader] = currentHeader;
            }
          });
        }
        
        // Handle added columns
        newHeaders.forEach(newHeader => {
          if (!Object.values(newMapping).includes(newHeader)) {
            newMapping[newHeader] = newHeader;
          }
        });
        
        headerMapping = newMapping;
        headers = newHeaders;
      } catch (err) {
        console.error("[Header Executor Error - SKIPPING]", op.type, err.message);
      }
    }
  }

  console.log('Final headers:', headers);

  // State management for operations that need memory
  const statefulContext = {
    duplicates: new Map(),
    similarityGroups: new Map(),
    columnDeduplication: new Map(),
    fuzzyDetectors: new Map(),
    columnDetectors: new Map()
  };

  // Initialize stateful detectors for relevant operations
  recipe.forEach(op => {
    if (op.type === 'fuzzy_remove_duplicates' && op.params?.columns) {
      const key = JSON.stringify(op.params.columns.sort());
      if (!statefulContext.fuzzyDetectors.has(key)) {
        statefulContext.fuzzyDetectors.set(key, new StreamingDuplicateDetector(op.params.columns, op.params));
      }
    }
    
    if (op.type === 'column_level_deduplication' && op.params?.column) {
      if (!statefulContext.columnDetectors.has(op.params.column)) {
        statefulContext.columnDetectors.set(op.params.column, new ColumnDuplicateDetector(op.params.column, op.params));
      }
    }
  });

  // Update operation parameters to use new header names
  const updatedRecipe = recipe.map(op => {
    const updatedOp = { ...op };
    if (updatedOp.params && Object.keys(headerMapping).length > 0) {
      // Update single column parameter
      if (updatedOp.params.column && headerMapping[updatedOp.params.column]) {
        updatedOp.params.column = headerMapping[updatedOp.params.column];
      }
      // Update multiple columns parameter  
      if (updatedOp.params.columns && Array.isArray(updatedOp.params.columns)) {
        updatedOp.params.columns = updatedOp.params.columns.map(col => 
          headerMapping[col] || col
        );
      }
    }
    return updatedOp;
  });

  let rowCount = 0;
  let processedCount = 0;
  
  const MAX_DEBUG_ROWS = 3;

  return new Transform({
    objectMode: true,

    /**
     * Transform - executed for every row in the CSV stream.
     * Enhanced with global data support and robust error handling.
     */
    async transform(row, encoding, callback) {
      try {
        rowCount++;
        const shouldDebug = rowCount <= MAX_DEBUG_ROWS;

        // Map row data to new headers if headers were changed
        let modifiedRow = {};
        if (Object.keys(headerMapping).length > 0) {
          // Use the header mapping to transform row data
          Object.keys(row).forEach(oldHeader => {
            const newHeader = headerMapping[oldHeader];
            if (newHeader && newHeader !== oldHeader) {
              modifiedRow[newHeader] = row[oldHeader];
            } else {
              modifiedRow[oldHeader] = row[oldHeader];
            }
          });
          
          // Ensure all final headers exist (for added columns)
          headers.forEach(header => {
            if (!(header in modifiedRow)) {
              modifiedRow[header] = '';
            }
          });
          
          // Remove old headers - only keep the final standardized headers
          Object.keys(modifiedRow).forEach(key => {
            if (!headers.includes(key)) {
              delete modifiedRow[key];
            }
          });
        } else {
          modifiedRow = { ...row };
        }

        let isRowFilteredOut = false;

        // Process operations in sequence with enhanced error handling
        for (const op of updatedRecipe) {
          const definition = operations[op.type];
          if (!definition) {
            console.warn(`Unknown operation type: ${op.type}`);
            continue;
          }

          try {
            if (shouldDebug) {
              console.log(`Applying operation: ${op.type}`);
            }

            // Handle stateful operations
            if (op.type === "remove_duplicates") {
                const columns = op.params.columns || [];
                
                if (columns.length === 0) {
                    console.log(`[WARNING] ${op.type} has no columns specified - skipping`);
                    continue;
                }

                const uniqueKey = JSON.stringify(columns.sort());
                if (!statefulContext.duplicates.has(uniqueKey)) {
                    statefulContext.duplicates.set(uniqueKey, new Set());
                }
                const seenSet = statefulContext.duplicates.get(uniqueKey);

                const rowKey = columns
                    .map((col) => String(modifiedRow[col] || "").trim().toLowerCase())
                    .join("||");

                if (seenSet.has(rowKey)) {
                    if (shouldDebug) console.log(`Row filtered by ${op.type}: ${rowKey}`);
                    isRowFilteredOut = true;
                    break;
                } else {
                    seenSet.add(rowKey);
                }
            }

            if (op.type === "fuzzy_remove_duplicates") {
                const columns = op.params.columns || [];
                
                if (columns.length === 0) {
                    console.log(`[WARNING] ${op.type} has no columns specified - skipping`);
                    continue;
                }

                const uniqueKey = JSON.stringify(columns.sort());
                const detector = statefulContext.fuzzyDetectors.get(uniqueKey);
                
                if (detector) {
                  const result = detector.processRow(modifiedRow, rowCount);
                  
                  if (result.isDuplicate && !result.keep) {
                      if (shouldDebug) console.log(`Row filtered by ${op.type}: ${JSON.stringify(columns)}`);
                      isRowFilteredOut = true;
                      break;
                  }
                }
            }

            // Handle column-level deduplication state
            if (op.type === "column_level_deduplication" && op.params.column) {
              const detector = statefulContext.columnDetectors.get(op.params.column);
              if (detector) {
                const result = detector.processRow(modifiedRow, rowCount);
                if (!result.keep) {
                  if (shouldDebug) console.log(`Row filtered by ${op.type} for column ${op.params.column}`);
                  isRowFilteredOut = true;
                  break;
                }
              }
            }

            // Handle async operations
            if (definition.rowExecutor) {
              try {
                const result = definition.rowExecutor(modifiedRow, op.params, headers, statefulContext);
                modifiedRow = result instanceof Promise ? await result : result;
              } catch (error) {
                console.error(`[Row Executor Error] ${op.type}:`, error.message);
                // Continue with next operation even if one fails
              }
            }

            // Handle row filters with proper error handling
            if (definition.rowFilter) {
              let filterResult;
              try {
                filterResult = definition.rowFilter(modifiedRow, op.params, headers, statefulContext);
              } catch (error) {
                console.error(`[Row Filter Error] ${op.type}:`, error.message);
                filterResult = true; // Don't filter on error
              }
              
              if (!filterResult) {
                isRowFilteredOut = true;
                if (shouldDebug) console.log(`Row filtered by ${op.type}`);
                break;
              }
            }
          } catch (error) {
            console.error(`[Operation Error - SKIPPING] ${op.type}:`, error.message);
            // Skip this operation but continue with others
          }
        }

        if (!isRowFilteredOut) {
          processedCount++;
          if (shouldDebug) {
            console.log(`Pushing row ${rowCount} (processed ${processedCount} total)`);
          }
          this.push(modifiedRow);
        } else {
          if (shouldDebug) {
            console.log(`Row ${rowCount} was filtered out`);
          }
        }

        callback();
      } catch (error) {
        console.error("[Row Processing Error at row", rowCount, "]", error.message);
        callback(error);
      }
    },

    flush(callback) {
      console.log(`=== GLOBAL CLEANING STREAM COMPLETE ===`);
      console.log(`Total rows received: ${rowCount}`);
      console.log(`Total rows processed: ${processedCount}`);
      console.log(`Rows filtered out: ${rowCount - processedCount}`);
      
      // Log stateful operation statistics
      statefulContext.fuzzyDetectors.forEach((detector, key) => {
        console.log(`Fuzzy detector ${key}:`, detector.getStats());
      });
      
      statefulContext.columnDetectors.forEach((detector, column) => {
        console.log(`Column detector ${column}:`, detector.getStats());
      });
      
      callback();
    },
  });
}

// Enhanced operation optimization
import { optimizeOperationSequence } from './utils/operationSequencer.js';

// Enhanced operation management
import OperationCoordinator from './OperationCoordinator.js';
import HeaderManager from './HeaderManager.js';
import OperationPreprocessor from './OperationPreprocessor.js';

// Enhanced engine function with global data support
export async function runEnhancedEngine(inputStream, operationsToApply, originalHeaders) {
    try {
        const coordinator = new OperationCoordinator(operationsToApply, originalHeaders);
        const result = await coordinator.executePipeline(inputStream);
        
        return {
            stream: result.stream,
            headers: result.finalHeaders,
            operationsApplied: result.operationsApplied,
            optimizationReport: coordinator.getOptimizationReport()
        };
    } catch (error) {
        console.error('Error in enhanced global engine:', error);
        // Fallback to existing createCleaningStream
        const stream = createCleaningStream(operationsToApply, originalHeaders);
        return {
            stream,
            headers: originalHeaders,
            operationsApplied: operationsToApply.length,
            optimizationReport: { usedLegacyEngine: true, error: error.message }
        };
    }
}

// Enhanced default export
export default {
    createCleaningStream,
    runEnhancedEngine,
    operations,
    optimizeOperationSequence,
    OperationCoordinator,
    HeaderManager,
    OperationPreprocessor
};