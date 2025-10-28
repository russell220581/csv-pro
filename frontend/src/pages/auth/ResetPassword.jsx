import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { FaKey, FaFileCsv, FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { resetToken } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error("Passwords do not match.");
        }
        if (!password) {
            return toast.error("Please enter a new password.");
        }
        setIsLoading(true);
        try {
            const { data } = await api.put(`/auth/resetpassword/${resetToken}`, { password });
            toast.success(data.message);
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center bg-base-200 p-4 py-8">
            <div className="card w-full max-w-md shadow-2xl bg-base-100">
                <form className="card-body" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center mb-4">
                        <FaFileCsv className="text-5xl text-primary mb-2" />
                        <h2 className="card-title text-3xl font-bold">Set New Password</h2>
                        <p className="text-base-content/70">Please enter a new strong password.</p>
                    </div>

                    {/* New Password Field with Toggle */}
                    <div className="form-control">
                        <label className="label"><span className="label-text">New Password</span></label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter new password" 
                                className="input input-bordered w-full pr-10" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <label className="label">
                            <span className="label-text-alt text-xs text-base-content/60">
                                Min 8 chars, 1 uppercase, 1 number, 1 symbol.
                            </span>
                        </label>
                    </div>

                    {/* Confirm New Password Field with Toggle */}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Confirm New Password</span></label>
                         <div className="relative">
                            <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="Confirm new password" 
                                className="input input-bordered w-full pr-10" 
                                required 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                            />
                            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="form-control mt-4">
                        <button className="btn btn-primary" type="submit" disabled={isLoading}>
                             {isLoading ? <span className="loading loading-spinner"></span> : <FaKey className="mr-2" />}
                            Reset Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;