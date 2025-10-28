import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { FaSignInAlt, FaFileCsv, FaEye, FaEyeSlash, FaPaperPlane, FaGoogle } from 'react-icons/fa';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // --- STATE to handle the "unverified" case ---
    const [needsVerification, setNeedsVerification] = useState(false);
    const [isResending, setIsResending] = useState(false);
    
    const navigate = useNavigate();

    const handleChange = (e) => {
        setNeedsVerification(false); // Reset this state if the user types again
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setNeedsVerification(false);
        try {
            const { data } = await api.post('/auth/login', formData);
            if (data.success) {
                localStorage.setItem('token', data.token);
                toast.success('Logged in successfully!');
                navigate('/app/dashboard');
            }
        } catch (error) {
            // --- Check for the specific "unverified" error ---
            const message = error.response?.data?.message || 'Login failed.';
            if (message.includes("verify your email")) {
                setNeedsVerification(true);
            } else {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Handler for the "Resend" button ---
    const handleResend = async () => {
        setIsResending(true);
        try {
            const { data } = await api.post('/auth/resend-verification', { email: formData.email });
            toast.success(data.message);
            setNeedsVerification(false); // Hide the resend button after a successful request
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resend email.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center bg-base-200 p-4 py-12">
            <div className="card w-full max-w-md shadow-2xl bg-base-100">
                <form className="card-body" onSubmit={handleSubmit}>
                    <div className="flex flex-col items-center mb-4">
                        <FaFileCsv className="text-5xl text-primary mb-2" />
                        <h2 className="card-title text-3xl font-bold">Welcome Back!</h2>
                        <p className="text-base-content/70">Login to your CSV Pro account.</p>
                    </div>

                    <div className="form-control">
                        <label className="label block"><span className="label-text">Email</span></label>
                        <input type="email" name="email" placeholder="email@example.com" className="input input-bordered w-full" required onChange={handleChange} value={formData.email} />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Password</span></label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                placeholder="password" 
                                className="input input-bordered w-full pr-10" 
                                required 
                                onChange={handleChange} 
                                value={formData.password} 
                            />
                            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <label className="label mt-1">
                            <Link to="/forgot-password" className="label-text-alt link link-hover link-primary">Forgot password?</Link>
                        </label>
                    </div>
                    
                    {/* --- Conditional UI for the "Resend" functionality --- */}
                    {needsVerification && (
                        <div className="alert alert-warning shadow-lg text-sm">
                            <div>
                                <span>Your email is not verified. Check your inbox or resend the link.</span>
                                <button type="button" className="btn btn-sm btn-primary ml-2" onClick={handleResend} disabled={isResending}>
                                    {isResending ? <span className="loading loading-spinner loading-xs"></span> : <FaPaperPlane />}
                                    Resend
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form-control mt-4">
                         <button className="btn btn-primary" type="submit" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner"></span> : <FaSignInAlt className="mr-2"/>}
                            Login
                        </button>
                    </div>
                    <div className="divider">OR</div>
                    <a 
                        href={`${import.meta.env.VITE_API_BASE_URL}/auth/google`} 
                        className="btn btn-outline w-full"
                    >
                        <FaGoogle className="mr-2" />
                        Sign in with Google
                    </a>
                     <div className="text-center mt-4">
                        <p className="text-sm">Don't have an account?{' '}
                            <Link to="/signup" className="link link-primary">Sign Up</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;