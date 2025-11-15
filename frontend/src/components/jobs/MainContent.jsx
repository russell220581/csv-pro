import { useState, useMemo } from 'react';
import { FaMagic, FaCheckCircle } from 'react-icons/fa';
import LivePreviewTable from './LivePreviewTable';
import toast from 'react-hot-toast';

const MainContent = ({ analysisReport, headerStatus, applyOperation, onApplyAll, processedPreview, onProcessFile, isProcessing, operations }) => {
    const [applyingAll, setApplyingAll] = useState(false);

    // Calculate fixable suggestions
    const fixableSuggestions = useMemo(() => {
        if (!analysisReport) return [];
        
        const allSuggestions = analysisReport
            .map(item => item.type === 'global' ? item : item.suggestions)
            .flat()
            .filter(Boolean)
            .filter(suggestion => suggestion.operation && !suggestion.warning);
            
        return allSuggestions;
    }, [analysisReport]);

    // Enhanced one-click fix handler for all suggestions
    const handleOneClickFix = async () => {
        if (fixableSuggestions.length === 0) {
            toast.error('No fixable issues found');
            return;
        }

        setApplyingAll(true);
        try {
            let appliedCount = 0;
            
            // Apply operations in smart order (structural first, then data cleaning)
            const structuralOps = fixableSuggestions.filter(s => 
                s.operation.type.includes('remove_') || s.operation.type.includes('empty_')
            );
            const cleaningOps = fixableSuggestions.filter(s => 
                !s.operation.type.includes('remove_') && !s.operation.type.includes('empty_')
            );
            
            const orderedOps = [...structuralOps, ...cleaningOps];
            
            for (const suggestion of orderedOps) {
                try {
                    applyOperation(suggestion.operation);
                    appliedCount++;
                    // Small delay to prevent UI freezing
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.warn(`Failed to apply operation: ${suggestion.id}`, error);
                }
            }
            
            if (appliedCount > 0) {
                toast.success(`Applied ${appliedCount} automatic fixes!`);
            } else {
                toast.info('All suggested fixes were already applied');
            }
        } catch (error) {
            toast.error('Failed to apply some automatic fixes');
        } finally {
            setApplyingAll(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Smart Analysis Header */}
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="card-title text-2xl">Smart Data Analysis</h2>
                            <p className="text-base-content/70">
                                We've analyzed your data and found opportunities to improve quality
                            </p>
                        </div>
                        
                        {/* Single One-Click Fix Button */}
                        {fixableSuggestions.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <button 
                                    className="btn btn-success"
                                    onClick={handleOneClickFix}
                                    disabled={applyingAll || isProcessing}
                                >
                                    {applyingAll ? (
                                        <span className="loading loading-spinner"></span>
                                    ) : (
                                        <FaMagic className="mr-2" />
                                    )}
                                    Fix {fixableSuggestions.length} Issues
                                </button>
                                <span className="text-xs text-center text-success">
                                    Applies all recommended fixes
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    {analysisReport && analysisReport.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4">
                            <div className="stat p-0">
                                <div className="stat-title">Issues Found</div>
                                <div className="stat-value text-lg">{fixableSuggestions.length}</div>
                            </div>
                            <div className="stat p-0">
                                <div className="stat-title">Auto-Fixable</div>
                                <div className="stat-value text-lg text-success">{fixableSuggestions.length}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Header Status Alert */}
            {headerStatus && (
                <div className={`alert ${headerStatus.status === 'fixed' ? 'alert-warning' : 'alert-success'}`}>
                    <div>
                        <FaCheckCircle />
                        <span>{headerStatus.message}</span>
                    </div>
                </div>
            )}

            {/* Analysis Report */}
            {analysisReport && analysisReport.length > 0 && (
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body">
                        <h3 className="card-title mb-4">Recommended Improvements</h3>
                        
                        <div className="space-y-4">
                            {analysisReport.map((item, index) => (
                                <ReportItem 
                                    key={item.id || index} 
                                    item={item} 
                                    applyOperation={applyOperation}
                                    isProcessing={isProcessing}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Live Preview & Process Button */}
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                    <LivePreviewTable 
                        data={processedPreview.data || []} 
                        headers={processedPreview.headers || []} 
                    />
                    <div className="card-actions justify-end mt-4">
                        <button 
                            className="btn btn-primary"
                            onClick={onProcessFile}
                            disabled={isProcessing || !operations || operations.length === 0}
                        >
                            {isProcessing ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                'Process Full File'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Enhanced Report Item Component
const ReportItem = ({ item, applyOperation, isProcessing }) => {
    const suggestions = item.type === 'global' ? [item] : item.suggestions;
    
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className={`border rounded-lg ${item.type === 'global' ? 'border-warning' : 'border-base-300'}`}>
            {item.type === 'column' && (
                <div className="bg-base-200 px-4 py-2 border-b">
                    <h4 className="font-semibold">{item.header}</h4>
                    <div className="text-sm text-base-content/70">
                        Detected as {item.detectedType} • {item.stats.totalRows} rows • {item.stats.uniqueCount} unique
                    </div>
                </div>
            )}
            
            <div className="p-4 space-y-3">
                {suggestions.filter(Boolean).map((suggestion, idx) => (
                    <SuggestionItem 
                        key={suggestion.id || idx}
                        suggestion={suggestion}
                        applyOperation={applyOperation}
                        isProcessing={isProcessing}
                    />
                ))}
            </div>
        </div>
    );
};

// Enhanced Suggestion Item Component
const SuggestionItem = ({ suggestion, applyOperation, isProcessing }) => {
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-error';
            case 'medium': return 'text-warning';
            case 'low': return 'text-info';
            default: return 'text-base-content';
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-lg ${
            suggestion.warning ? 'bg-warning/10' : 'bg-base-200'
        }`}>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority?.toUpperCase()}
                    </span>
                    {suggestion.isPremium && (
                        <span className="badge badge-warning badge-sm">PREMIUM</span>
                    )}
                    {suggestion.warning && (
                        <span className="badge badge-info badge-sm">INFO</span>
                    )}
                </div>
                <p className="text-sm">{suggestion.description}</p>
            </div>
            
            {suggestion.operation && !suggestion.warning && (
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => applyOperation(suggestion.operation)}
                    disabled={isProcessing}
                >
                    Apply
                </button>
            )}
        </div>
    );
};

export default MainContent;