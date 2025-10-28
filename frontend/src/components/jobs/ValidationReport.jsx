import { useState, useMemo } from 'react';
import { FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';

import { 
    useReactTable, 
    getCoreRowModel, 
    getPaginationRowModel, 
    flexRender // 1. Import flexRender
} from '@tanstack/react-table';

const ValidationReport = ({ errors, onAcknowledge }) => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

    const errorSummary = useMemo(() => {
        const summary = {};
        errors.forEach(err => {
            const code = err.code || 'UnknownError';
            summary[code] = (summary[code] || 0) + 1;
        });
        return Object.entries(summary);
    }, [errors]);

    const columns = useMemo(() => [
        { accessorKey: 'row', header: 'Row #' },
        { accessorKey: 'code', header: 'Error Code' },
        { accessorKey: 'message', header: 'Details' },
    ], []);

    const table = useReactTable({
        data: errors,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        // We can get the page count directly from the table instance
    });

    return (
        <div className="card bg-error/10 shadow-xl border border-error">
            <div className="card-body">
                <h2 className="card-title text-2xl"><FaExclamationTriangle className="text-error" /> Structural Errors Found</h2>
                <p className="text-error-content/80">We found **{errors.length}** problematic rows in your file. Processing may be unpredictable.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="p-4 bg-base-100/50 rounded-box">
                        <h3 className="font-bold mb-2">Error Summary:</h3>
                        <ul className="list-disc list-inside text-sm">
                            {errorSummary.map(([code, count]) => (
                                <li key={code}><strong>{code}:</strong> {count} instances</li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-4 bg-base-100/50 rounded-box flex flex-col justify-center">
                        <h3 className="font-bold mb-2">How to proceed?</h3>
                        <p className="text-sm mb-4">For best results, fix these issues in your original file and re-upload. Alternatively, you can discard these rows and continue.</p>
                        <button onClick={() => onAcknowledge('discard')} className="btn btn-warning w-full">
                            Discard all {errors.length} Error Rows & Continue
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="font-bold mb-2">Error Details (Page {pagination.pageIndex + 1} of {table.getPageCount()})</h3>
                    <div className="overflow-x-auto border border-base-300 rounded-box">
                        <table className="table table-sm w-full">
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id}>
                                                {header.isPlaceholder ? null : (
                                                    // --- THIS IS THE CRITICAL FIX ---
                                                    // 2. Use flexRender to render the header content
                                                    flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>
                                                 {/* 3. Use flexRender for cell content as well */}
                                                {flexRender(
                                                    cell.column.columnDef.cell, 
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="flex items-center gap-2 mt-4 justify-center">
                        <button className="btn btn-sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>« First</button>
                        <button className="btn btn-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹ Prev</button>
                        <span className="font-mono text-sm">Page {pagination.pageIndex + 1} of {table.getPageCount()}</span>
                        <button className="btn btn-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next ›</button>
                        <button className="btn btn-sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last »</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ValidationReport;