import { useState, useEffect, useMemo } from 'react';
import { flexRender } from '@tanstack/react-table';
import api from '../../api';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { format } from 'date-fns';
import Spinner from '../../components/common/Spinner';

const UserManagement = () => {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const columns = useMemo(() => [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'plan', header: 'Plan', cell: info => <span className={`badge ${info.getValue() === 'premium' ? 'badge-success' : 'badge-ghost'}`}>{info.getValue()}</span> },
        { accessorKey: 'monthlyJobCount', header: 'Jobs (Month)' },
        { accessorKey: 'createdAt', header: 'Date Joined', cell: info => format(new Date(info.getValue()), 'PP') },
    ], []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: resData } = await api.get('/admin/users', {
                    params: {
                        page: pagination.pageIndex + 1,
                        limit: pagination.pageSize,
                    }
                });
                 console.log('Users API Response:', resData); // ← ADD THIS
                setData(resData.data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [pagination]);

    const table = useReactTable({
        data,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
    });

    if (isLoading && data.length === 0) return <Spinner message="Loading users..." size="lg" />;

    return (
        <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
                <h1 className="card-title text-3xl">User Management</h1>
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? null}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-2 mt-4 justify-center">
                    <button className="btn" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>«</button>
                    <button className="btn" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹</button>
                    <span className="p-2">Page {table.getState().pagination.pageIndex + 1}</span>
                    <button className="btn" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>›</button>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;