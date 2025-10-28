import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const EmailVerify = () => {
    const { id, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const verifyEmailUrl = async () => {
            if (!id || !token) {
                setStatus('failed');
                setErrorMessage('Invalid verification link.');
                return;
            }

            try {
                const { data } = await api.get(`/auth/verify/${id}/${token}`);
                if (data.success) {
                    // --- THE "AUTO-LOGIN" ---
                    // 1. Save the token returned from the API
                    localStorage.setItem('token', data.token);
                    
                    // 2. Show a success message and then redirect
                    setStatus('success');
                    toast.success('Email verified successfully! Welcome!');
                    
                    // 3. Redirect to the dashboard after a short delay
                    setTimeout(() => {
                        navigate('/app/dashboard', { replace: true });
                    }, 1500);
                }
            } catch (error) {
                setStatus('failed');
                setErrorMessage(error.response?.data?.message || 'Verification failed. The link may be expired or invalid.');
            }
        };

        verifyEmailUrl();
    }, [id, token, navigate]);

    const renderContent = () => {
        switch (status) {
            case 'success':
                return (
                    <div className="text-center">
                        <FaCheckCircle className="text-6xl text-success mx-auto mb-4" />
                        <h1 className="text-3xl font-bold">Verification Successful!</h1>
                        <p className="mt-2">Redirecting you to your dashboard...</p>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center">
                        <FaTimesCircle className="text-6xl text-error mx-auto mb-4" />
                        <h1 className="text-3xl font-bold">Verification Failed</h1>
                        <p className="mt-2 text-base-content/80">{errorMessage}</p>
                        <Link to="/login" className="btn btn-primary mt-6">Back to Login</Link>
                    </div>
                );
            case 'verifying':
            default:
                return (
                    <div className="text-center">
                        <Spinner message="Verifying your email..." size="lg" />
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <div className="card w-full max-w-lg bg-base-100 shadow-xl">
                <div className="card-body p-12">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default EmailVerify;