import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaExclamationTriangle } from 'react-icons/fa';

const HeaderFixer = ({ originalHeaders, onHeadersConfirmed }) => {
    const [headers, setHeaders] = useState([...originalHeaders]);

    const handleHeaderChange = (index, value) => {
        const newHeaders = [...headers];
        newHeaders[index] = value;
        setHeaders(newHeaders);
    };

    const handleSubmit = () => {
        const headerSet = new Set();
        for (const header of headers) {
            if (!header || header.trim() === '') {
                toast.error('All header fields must have a name.');
                return;
            }
            if (headerSet.has(header.trim())) {
                toast.error(`Duplicate header found: "${header}". All header names must be unique.`);
                return;
            }
            headerSet.add(header.trim());
        }
        onHeadersConfirmed(headers.map(h => h.trim()));
    };

    return (
        <div className="card bg-warning/10 shadow-xl border border-warning">
            <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                    <FaExclamationTriangle className="text-4xl text-warning" />
                    <div>
                        <h2 className="card-title text-2xl">Header Issues Detected!</h2>
                        <p className="text-warning-content/80">
                            Your CSV file has duplicate or empty column headers. Please correct them to continue.
                        </p>
                    </div>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-base-100 rounded-box">
                    {originalHeaders.map((header, index) => (
                        <div key={index} className="form-control">
                            <label className="input-group">
                                <span>{`Col ${index + 1}`}</span>
                                <input
                                    type="text"
                                    value={headers[index]}
                                    onChange={(e) => handleHeaderChange(index, e.target.value)}
                                    className="input input-bordered w-full"
                                />
                            </label>
                        </div>
                    ))}
                </div>

                <div className="card-actions justify-end mt-6">
                    <button onClick={handleSubmit} className="btn btn-primary">
                        Confirm Headers & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeaderFixer;