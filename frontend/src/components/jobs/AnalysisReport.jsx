import { FaCheckCircle, FaExclamationTriangle, FaMagic, FaTrash, FaGlobe, FaLayerGroup, FaBolt } from 'react-icons/fa';
import HeaderStatus from './HeaderStatus';

// --- Sub-component for Global (file-wide) issues ---
const GlobalReportCard = ({ item, onApplyFix }) => {
    const { id, description, operation, isPremium } = item;
    const icon = id === 'duplicate_rows' ? <FaLayerGroup /> : <FaGlobe />;

    return (
        <div className="col-span-full card card-compact bg-base-200/50 shadow-md border border-base-300">
            <div className="card-body sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {icon}
                    <p>{description}</p>
                </div>
                <div className="card-actions justify-end flex-shrink-0">
                    <button className="btn btn-sm btn-primary" onClick={() => onApplyFix(operation)}>
                        Apply Fix {isPremium && <span className="badge badge-warning text-xs">PRO</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-component for Per-Column issues ---
const ColumnReportCard = ({ item, onApplyFix }) => {
    const { header, detectedType, confidence, mismatchCount, totalRows, suggestion } = item;

    // Determine visual style based on whether there's an actionable suggestion
    const needsAttention = !!suggestion;
    const cardColor = needsAttention ? 'border-warning/50' : 'border-success/30';
    const icon = needsAttention ? <FaExclamationTriangle className="text-warning" /> : <FaCheckCircle className="text-success" />;

    return (
        <div className={`card card-compact bg-base-200 shadow-md border ${cardColor}`}>
            <div className="card-body">
                <div className="flex justify-between items-center">
                    <h3 className="card-title text-base truncate" title={header}>{header}</h3>
                    {icon}
                </div>
                <div className="text-sm text-base-content/70">
                    <p>Detected Type: <span className="font-bold capitalize">{detectedType}</span></p>
                    {needsAttention ? (
                        <p className="text-warning">{suggestion.description}</p>
                    ) : (
                        <p>Confidence: <span className="font-bold">{Math.round(confidence * 100)}%</span></p>
                    )}
                </div>
                {needsAttention && (
                    <div className="card-actions justify-end mt-2">
                        <button className="btn btn-xs btn-primary" onClick={() => onApplyFix(suggestion.operation)}>
                            <FaMagic /> Apply Fix {suggestion.isPremium && <span className="badge badge-warning text-xs">PRO</span>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main AnalysisReport Component ---
const AnalysisReport = ({ report, headerStatus, onApplyFix, onApplyAll }) => {
    // The report is now the unified array. We check if it has any actionable suggestions.
    const hasSuggestions = report?.some(item => item.suggestion || item.type === 'global');

    if (!hasSuggestions && !headerStatus) {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                    <FaCheckCircle className="text-4xl text-success" />
                    <h2 className="card-title">Analysis Complete!</h2>
                    <p>No major issues or automatic suggestions found in your data sample.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                    <h2 className="card-title text-xl">File Health Report</h2>
                    {/* --- THE "APPLY ALL" BUTTON --- */}
                    {hasSuggestions && (
                        <button className="btn btn-primary" onClick={onApplyAll}>
                            <FaBolt />
                            Apply All Recommended Fixes
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    
                    <HeaderStatus status={headerStatus?.status} message={headerStatus?.message} />
                    
                    {report?.map((item, index) => {
                        switch (item.type) {
                            case 'global':
                                return <GlobalReportCard key={item.id || index} item={item} onApplyFix={onApplyFix} />;
                            case 'column':
                                // Only render a card if it needs attention or is otherwise interesting.
                                // You could also choose to show all cards regardless.
                                if (item.suggestion) {
                                    return <ColumnReportCard key={item.header || index} item={item} onApplyFix={onApplyFix} />;
                                }
                                return null;
                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalysisReport;