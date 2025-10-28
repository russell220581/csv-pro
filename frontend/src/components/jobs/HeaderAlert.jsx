import { useState, useEffect } from 'react';
import { FaWrench, FaCheck, FaEdit } from 'react-icons/fa';

// Import the new helper function directly for client-side use.
import { cleanHeaders } from '#cleaning-engine/helpers';

const HeaderAlert = ({ originalHeaders, onHeadersConfirmed, onCancel }) => {
    // Generate the suggested headers automatically on component mount.
    const suggestedHeaders = cleanHeaders(originalHeaders);

    // State to hold the headers if the user decides to edit them manually.
    const [editableHeaders, setEditableHeaders] = useState(suggestedHeaders);
    const [isEditing, setIsEditing] = useState(false);

    const handleManualChange = (index, value) => {
        const newHeaders = [...editableHeaders];
        newHeaders[index] = value;
        setEditableHeaders(newHeaders);
    };

    const handleConfirmManual = () => {
        // Basic check for empty headers in manual mode
        if (editableHeaders.some(h => !h.trim())) {
            alert('Header names cannot be empty.');
            return;
        }
        onHeadersConfirmed(editableHeaders);
    };
    
    return (
        <div className="card bg-warning text-warning-content shadow-xl border-2 border-warning-content/50">
            <div className="card-body">
                <div className="flex items-center gap-4">
                    <FaWrench className="text-4xl" />
                    <div>
                        <h2 className="card-title">Header Issues Detected!</h2>
                        <p>We found empty fields, duplicates, or messy formatting in your column headers. We've suggested some automatic fixes.</p>
                    </div>
                </div>

                {/* The Main Content: Either show the diff or the edit form */}
                <div className="mt-4 bg-base-100/20 p-4 rounded-lg">
                    {isEditing ? (
                        // --- MANUAL EDITING MODE ---
                        <div>
                            <p className="text-sm font-semibold mb-2">Edit the suggested headers as needed:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {editableHeaders.map((header, index) => (
                                    <input 
                                        key={index}
                                        type="text"
                                        value={header}
                                        onChange={(e) => handleManualChange(index, e.target.value)}
                                        className="input input-sm input-bordered"
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        // --- SUGGESTION REVIEW MODE ---
                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full">
                                <thead>
                                    <tr className="text-warning-content/70">
                                        <th>Original Header</th>
                                        <th>Suggested Fix</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {originalHeaders.map((header, index) => (
                                        <tr key={index}>
                                            <td className="font-mono opacity-70">"{header || '(empty)'}"</td>
                                            <td className="font-mono font-bold">{suggestedHeaders[index]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* The Action Buttons */}
                <div className="card-actions justify-end mt-4">
                    {isEditing ? (
                        <>
                            <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel Edit</button>
                            <button className="btn btn-primary" onClick={handleConfirmManual}><FaCheck /> Confirm Manual Changes</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost" onClick={onCancel}><FaTimes /> Discard & Cancel</button>
                            <button className="btn btn-neutral" onClick={() => setIsEditing(true)}><FaEdit /> Edit Manually</button>
                            <button className="btn btn-primary" onClick={() => onHeadersConfirmed(suggestedHeaders)}><FaCheck /> Accept All Suggestions</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeaderAlert;