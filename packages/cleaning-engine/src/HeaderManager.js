class HeaderManager {
    constructor(originalHeaders) {
        this.originalHeaders = originalHeaders;
        this.currentHeaders = [...originalHeaders];
        this.headerMapping = this.initializeMapping();
        this.addedColumns = new Set();
    }

    initializeMapping() {
        const mapping = {};
        this.originalHeaders.forEach(header => {
            mapping[header] = header;
        });
        return mapping;
    }

    updateHeaders(newHeaders, operationType = '') {
        const oldHeaders = new Set(this.currentHeaders);
        const newHeadersSet = new Set(newHeaders);
        
        // Track added columns
        newHeaders.forEach(header => {
            if (!oldHeaders.has(header)) {
                this.addedColumns.add(header);
                this.headerMapping[header] = header;
            }
        });

        // Track removed columns
        this.currentHeaders.forEach(header => {
            if (!newHeadersSet.has(header) && !this.addedColumns.has(header)) {
                delete this.headerMapping[header];
            }
        });

        this.currentHeaders = newHeaders;
        
        console.log(`Header update for ${operationType}:`, {
            from: Array.from(oldHeaders),
            to: newHeaders,
            added: Array.from(newHeadersSet).filter(h => !oldHeaders.has(h)),
            removed: Array.from(oldHeaders).filter(h => !newHeadersSet.has(h))
        });
    }

    translateColumnReference(columnName) {
        return this.headerMapping[columnName] || columnName;
    }

    translateOperationParameters(operation) {
        const translated = { ...operation };
        
        if (translated.params) {
            // Translate single column reference
            if (translated.params.column) {
                translated.params.column = this.translateColumnReference(translated.params.column);
            }
            
            // Translate multiple column references
            if (translated.params.columns) {
                translated.params.columns = translated.params.columns.map(col => 
                    this.translateColumnReference(col)
                );
            }
            
            // Translate address column reference
            if (translated.params.addressColumn) {
                translated.params.addressColumn = this.translateColumnReference(translated.params.addressColumn);
            }
        }
        
        return translated;
    }

    validateColumnReferences(operation) {
        const errors = [];
        
        if (operation.params) {
            if (operation.params.column && !this.currentHeaders.includes(operation.params.column)) {
                errors.push(`Column "${operation.params.column}" not found in current headers`);
            }
            
            if (operation.params.columns) {
                operation.params.columns.forEach(col => {
                    if (!this.currentHeaders.includes(col)) {
                        errors.push(`Column "${col}" not found in current headers`);
                    }
                });
            }
        }
        
        return errors;
    }

    getCurrentHeaders() {
        return [...this.currentHeaders];
    }

    getHeaderMapping() {
        return { ...this.headerMapping };
    }

    getTransformationReport() {
        return {
            originalHeaders: this.originalHeaders,
            currentHeaders: this.currentHeaders,
            addedColumns: Array.from(this.addedColumns),
            headerMapping: this.headerMapping
        };
    }
}

export default HeaderManager;