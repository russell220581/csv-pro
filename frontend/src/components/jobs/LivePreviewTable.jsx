import React from 'react';

const LivePreviewTable = ({ data, headers }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full border rounded-lg bg-base-100">
                <p className="text-neutral-500">Upload a file to see a preview</p>
            </div>
        );
    }
    
    return (
        <div className="h-full overflow-auto">
            <table className="table table-pin-rows table-pin-cols table-xs">
                <thead>
                    <tr>
                        {headers.map(header => <th key={header}>{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}-${JSON.stringify(row)}`}>
                            {headers.map(header => (
                                <td key={`${rowIndex}-${header}`} className="whitespace-nowrap">
                                    {String(row[header] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LivePreviewTable;
