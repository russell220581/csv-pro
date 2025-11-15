import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// Local Imports
import api from '../../api';
import Spinner from '../common/Spinner';
import LivePreviewTable from './LivePreviewTable';
import { FaCheckCircle, FaTimesCircle, FaDownload, FaRocket, FaTimes } from 'react-icons/fa';

// A sub-component for displaying the final success or failure screen.
const StatusScreen = ({ status, finalJobData, isGeneratingLink, handleDownload, onClose }) => {
    if (status === 'completed') {
        return (
            <div className="text-center">
                <FaCheckCircle className="text-6xl text-success mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Job Completed!</h2>
                <p className="mt-2">Your file has been successfully cleaned.</p>
                <div className="mt-6 space-x-2">
                    <button className="btn btn-primary" onClick={handleDownload} disabled={isGeneratingLink}>
                        {isGeneratingLink ? <span className="loading loading-spinner loading-xs"></span> : <FaDownload />}
                        Download File
                    </button>
                    <button onClick={onClose} className="btn btn-ghost">Start New Job</button>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        let failureMessage = finalJobData?.message || 'An unknown error occurred.';
        if (finalJobData?.reason === 'QUOTA_LIMIT_ROWS') {
            failureMessage = "Your file exceeded the row limit for the Free Plan.";
        } else if (finalJobData?.reason === 'QUOTA_LIMIT_JOBS') {
            failureMessage = "This job could not be processed because your monthly limit was reached.";
        }

        return (
            <div className="text-center">
                <FaTimesCircle className="text-6xl text-error mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Job Failed</h2>
                <p className="mt-2 text-base-content/80">{failureMessage}</p>
                <div className="mt-6 space-x-2">
                    {finalJobData?.reason === 'QUOTA_LIMIT_ROWS' && (
                        <Link to="/app/settings" className="btn btn-accent" onClick={onClose}>
                            <FaRocket/> Upgrade Plan
                        </Link>
                    )}
                    <button onClick={onClose} className="btn btn-ghost">Try Again</button>
                </div>
            </div>
        );
    }

    return null;
};

const JobProcessingModal = ({ isOpen, jobId, onClose, initialPreviewData }) => {
    const [status, setStatus] = useState('processing');
    const [hasServerResponded, setHasServerResponded] = useState(false);
    const [progress, setProgress] = useState({ percentage: 0, message: 'Initiating...' });
    const [finalJobData, setFinalJobData] = useState(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    useEffect(() => {
        if (!isOpen || !jobId) {
            return; // Do nothing if the modal isn't open or has no job to track.
        }

        // Reset all states for the new job when the modal opens.
        setStatus('processing');
        setHasServerResponded(false);
        setProgress({ percentage: 0, message: 'Queuing job...' });
        setFinalJobData(null);
        setIsGeneratingLink(false);

        // --- ADD THIS LOG ---
        const socketUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        console.log('[CLIENT DEBUG] Attempting to connect socket to URL:', socketUrl);
        // --- END ADD ---

        // Connect to the WebSocket server.
        const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

        socket.on('connect', () => {
            console.log('Socket.IO connected, subscribing to job:', jobId);
            socket.emit('subscribeToJob', jobId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            toast.error("Could not connect to real-time updates server.");
        });

        socket.on('progressUpdate', (data) => {
            setHasServerResponded(true); // Mark that we've received the first real update
            setProgress({ percentage: data.percentage, message: data.message });
        });

        socket.on('jobCompleted', (data) => {
            setHasServerResponded(true);
            setStatus('completed');
            setFinalJobData(data);
        });

        socket.on('jobFailed', (data) => {
            setHasServerResponded(true);
            setStatus('failed');
            setFinalJobData(data);
        });

        // Cleanup function: This is crucial to prevent memory leaks.
        return () => {
            console.log('Disconnecting socket...');
            socket.disconnect();
        };
    }, [isOpen, jobId]);

    const handleDownload = async () => {
        if (!jobId) return;
        setIsGeneratingLink(true);
        try {
            // FIX: Use the correct endpoint and handle file download properly
            const response = await api.get(`/jobs/${jobId}/stream`, {
                responseType: 'blob' // Important: tell axios to handle binary data
            });

            // Create a blob URL for download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'cleaned_file.csv';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            link.remove();
            
            toast.success('Download started!');
            
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.response?.data?.message || 'Download failed.');
        } finally {
            setIsGeneratingLink(false);
        }
    };
    
    const modalStyles = {
        content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', border: 'none', padding: '0', borderRadius: '1rem', width: '90%', maxWidth: '600px', backgroundColor: 'transparent' },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000 }
    };

    const renderContent = () => {
        // If the job is processing AND we haven't received a real update from the server yet,
        // show the "Optimistic" UI with the preview table.
        if (status === 'processing' && !hasServerResponded) {
            return (
                <div className="text-center">
                    <Spinner message={null} size="lg" />
                    <h2 className="text-2xl font-bold mt-4">Processing...</h2>
                    <p className="text-sm text-base-content/70 h-5 mb-4">{progress.message}</p>
                    <div className="h-60 flex flex-col border border-base-300 rounded-lg">
                        <LivePreviewTable 
                            data={initialPreviewData?.data || []} 
                            headers={initialPreviewData?.headers || []} 
                        />
                    </div>
                    <p className="text-xs mt-4 text-base-content/50">Showing initial preview while the full file is processed.</p>
                </div>
            );
        }

        // If the server has responded, show either the real progress bar or the final status screen.
        if (status === 'processing' && hasServerResponded) {
            return (
                <div className="text-center">
                    <Spinner message={null} size="lg" />
                    <h2 className="text-2xl font-bold mt-4">Processing Your File...</h2>
                    <div className="w-full bg-base-300 rounded-full h-4 my-4 overflow-hidden">
                        <div 
                            className="bg-primary h-4 rounded-full transition-all duration-300 ease-linear" 
                            style={{ width: `${progress.percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-base-content/70 h-5">{progress.message}</p>
                    <p className="text-xs mt-4 text-base-content/50">You can close this window; your job will continue in the background.</p>
                </div>
            );
        }

        // If status is 'completed' or 'failed', render the final screen.
        return (
             <StatusScreen 
                status={status}
                finalJobData={finalJobData}
                isGeneratingLink={isGeneratingLink}
                handleDownload={handleDownload}
                onClose={onClose}
            />
        );
    };

    return (
        <Modal isOpen={isOpen} style={modalStyles} contentLabel="Job Processing Status" onRequestClose={onClose}>
             <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-8">
                    {status !== 'processing' && (
                        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><FaTimes /></button>
                    )}
                    {renderContent()}
                </div>
            </div>
        </Modal>
    );
};

export default JobProcessingModal;