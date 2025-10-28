import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FaDownload, FaTrash, FaSync, FaSpinner } from 'react-icons/fa';

const JobHistory = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioningJobId, setActioningJobId] = useState(null);

    const fetchJobs = () => {
        setLoading(true);
        api.get('/jobs')
            .then(res => setJobs(res.data.data))
            .catch(() => toast.error("Could not fetch job history."))
            .finally(() => setLoading(false));
    };
    
    useEffect(() => { fetchJobs(); }, []);

    const handleDownload = (jobId) => {
        // Simply navigate to the streaming endpoint. The browser will handle the download.
        const downloadUrl = `${import.meta.env.VITE_API_BASE_URL}/jobs/${jobId}/stream`;
        // We need to attach the token for this request to be authenticated.
        // A simple redirect won't work. We fetch and create a blob URL.
        setActioningJobId(jobId);
        api.get(`/jobs/${jobId}/stream`, { responseType: 'blob' }) // IMPORTANT: get as a blob
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                const contentDisposition = response.headers['content-disposition'];
                let filename = 'cleaned_file.csv';
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch.length === 2) filename = filenameMatch[1];
                }
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch(() => toast.error("Download failed."))
            .finally(() => setActioningJobId(null));
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm("Are you sure you want to permanently delete this job and its files?")) return;
        setActioningJobId(jobId);
        try {
            await api.delete(`/jobs/${jobId}`); // This call is now correct
            setJobs(prev => prev.filter(job => job._id !== jobId));
            toast.success("Job deleted successfully.");
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete job.');
        } finally {
            setActioningJobId(null);
        }
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            completed: 'badge-success',
            processing: 'badge-info',
            failed: 'badge-error',
            pending: 'badge-ghost',
        };
        return <div className={`badge ${colors[status] || 'badge-ghost'}`}>{status}</div>;
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="card-title text-2xl">Job History</h2>
                    <button className="btn btn-ghost" onClick={fetchJobs} disabled={loading}><FaSync className={loading ? 'animate-spin' : ''} /> Refresh</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Date Created</th>
                                <th>Status & Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map(job => (
                                <tr key={job._id}>
                                    <td>{job.originalFileName}</td>
                                    <td>{format(new Date(job.createdAt), 'PPpp')}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={job.status} />
                                            {job.status === 'completed' && (
                                                <>
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleDownload(job._id)} disabled={actioningJobId === job._id}>
                                                        {actioningJobId === job._id ? <FaSpinner className="animate-spin" /> : <FaDownload />} Download
                                                    </button>
                                                    <button className="btn btn-sm btn-ghost btn-circle text-error" onClick={() => handleDelete(job._id)} disabled={actioningJobId === job._id}>
                                                        {actioningJobId === job._id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <p className="text-center p-4">Loading...</p>}
                    {!loading && jobs.length === 0 && <p className="text-center p-4">You have no job history.</p>}
                </div>
            </div>
        </div>
    );
};

export default JobHistory;