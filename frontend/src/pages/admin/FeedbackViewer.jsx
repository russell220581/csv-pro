import { useState, useEffect, useMemo } from 'react';
import { flexRender } from '@tanstack/react-table';
import api from '../../api';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const FeedbackViewer = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: resData } = await api.get('/admin/feedback'); // Assuming this endpoint exists now
            // We'll need to create this endpoint in the backend. I will provide the code.
            console.log('Feedback API Response:', resData); // ← ADD THIS
            setData(resData.data);
        } catch (error) {
            console.error("Failed to fetch feedback", error);
            toast.error("Could not load feedback.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = useMemo(() => [
        { 
            accessorKey: 'priority', 
            header: 'Priority',
            cell: info => <span className={`badge ${info.getValue() === 'high' ? 'badge-error' : 'badge-ghost'}`}>{info.getValue()}</span> 
        },
        { accessorFn: row => row.user?.email || 'N/A', header: 'User Email' },
        { accessorKey: 'category', header: 'Category' },
        { accessorKey: 'message', header: 'Message', cell: info => <p className="whitespace-normal max-w-sm">{info.getValue()}</p> },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'createdAt', header: 'Date', cell: info => format(new Date(info.getValue()), 'PP') },
    ], []);

    const table = useReactTable({
        data,
        columns,
        state: { 
            sorting: [{ id: 'priority', desc: true }, { id: 'createdAt', desc: true }] 
        },
        onSortingChange: () => {}, // Disable client-side sorting for now
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (isLoading) return <Spinner message="Loading feedback..." size="lg" />;

    return (
        <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
                <h1 className="card-title text-3xl">User Feedback</h1>
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
            </div>
        </div>
    );
};

export default FeedbackViewer;