import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { FaPaperPlane, FaFileCsv } from 'react-icons/fa';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await api.post('/auth/forgotpassword', { email });
            toast.success(data.message, { duration: 6000 });
        } catch (error) {
            // Even on error, show a generic success message to prevent email enumeration
            toast.success("If an account with that email exists, a reset link has been sent.");
            console.error(error); // Log the actual error for developers
        } finally {
            setIsLoading(false);
            setEmail(''); // Clear the input field
        }
    };

    return (
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center bg-base-200 p-4 py-8">
            <div className="card w-full max-w-md shadow-2xl bg-base-100">
                <form className="card-body" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center mb-4">
                        <FaFileCsv className="text-5xl text-primary mb-2" />
                        <h2 className="card-title text-3xl font-bold">Forgot Password?</h2>
                        <p className="text-base-content/70 text-center mt-2">No problem. Enter your email and we'll send a link to reset your password.</p>
                    </div>

                    <div className="form-control">
                        <label className="label block"><span className="label-text">Your Email Address</span></label>
                        <input 
                            type="email" 
                            placeholder="your@email.com" 
                            className="input input-bordered w-full" 
                            required 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                    </div>
                    <div className="form-control mt-4">
                        <button className="btn btn-primary" type="submit" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner"></span> : <FaPaperPlane className="mr-2" />}
                            Send Reset Link
                        </button>
                    </div>
                     <div className="text-center mt-4">
                        <p className="text-sm">Remember your password?{' '}
                            <Link to="/login" className="link link-primary">Login</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;