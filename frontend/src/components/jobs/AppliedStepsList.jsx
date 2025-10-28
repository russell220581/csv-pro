import React from 'react';
// Import all possible icons and a default
import {
    FaTrash, FaQuestionCircle, FaColumns, FaFont, FaBroom, FaFilter, FaMagic,
    FaLink, FaCode, FaSearch, FaRegClone, FaCheckSquare, FaPhoneAlt, FaCalendarAlt, FaEnvelope, FaPen
} from 'react-icons/fa';

// Relative path with our clean and robust Vite alias.
import { operations as operationDefinitions } from '@cleaning-engine/operations.js';

// Create a map to look up the icon component from a string name
const iconMap = {
    FaColumns, FaFont, FaBroom, FaFilter, FaMagic, FaLink, FaCode, FaSearch,
    FaRegClone, FaCheckSquare, FaPhoneAlt, FaCalendarAlt, FaEnvelope, FaPen
};

const AppliedStepsList = ({ operations, onRemoveOperation }) => {
    if (!operations || operations.length === 0) {
        return (
            <div className="flex items-center justify-center p-4 h-24 bg-base-100 rounded-lg shadow-inner">
                <p className="text-sm text-base-content/60">Your cleaning recipe is empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto p-2 bg-base-100 rounded-lg shadow-inner">
            {operations.map((op, index) => {
                const definition = operationDefinitions[op.type];
                
                if (!definition) {
                    return (
                        <div key={op.id} className="flex items-center justify-between p-3 bg-error/20 rounded-lg">
                            <p className="text-sm text-error-content">Unknown Operation</p>
                            <button onClick={() => onRemoveOperation(op.id)}><FaTrash /></button>
                        </div>
                    );
                }

                const IconComponent = iconMap[definition.icon] || FaQuestionCircle;
                const title = definition.name || 'Unknown Operation';
                const details = definition.getDetails ? definition.getDetails(op.params) : 'No details available.';
                const isCritical = op.isCritical; // Check if this is an auto-applied operation

                return (
                    <div key={op.id} className={`flex items-center justify-between p-3 rounded-lg animate-fade-in ${
                        isCritical ? 'bg-success/20 border-l-4 border-success' : 'bg-base-200'
                    }`}>
                        <div className="flex items-center gap-4 overflow-hidden">
                            <span className={`flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full font-bold ${
                                isCritical ? 'bg-success text-success-content' : 'bg-primary text-primary-content'
                            }`}>
                                <IconComponent /> 
                            </span>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-base-content">{title}</p>
                                    {isCritical && (
                                        <span className="badge badge-success badge-xs">Auto-Applied</span>
                                    )}
                                </div>
                                <p className="text-xs text-base-content/70 truncate" title={details}>{details}</p>
                            </div>
                        </div>
                        {/* Only show delete button for non-critical operations */}
                        {!isCritical && (
                            <button 
                                onClick={() => onRemoveOperation(op.id)}
                                className="btn btn-ghost btn-sm btn-circle text-error ml-2"
                                aria-label={`Remove operation: ${title}`}
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AppliedStepsList;