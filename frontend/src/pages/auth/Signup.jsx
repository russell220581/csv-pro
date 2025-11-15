import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { generate } from 'generate-password-browser';
import { FaUserPlus, FaFileCsv, FaEye, FaEyeSlash, FaMagic, FaGoogle } from 'react-icons/fa';

const Signup = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await api.post('/auth/register', formData);
            if (data.success) {
                toast.success(data.message, { duration: 5000 }); // Show the "check your email" message
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Signup failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Handler for the "Generate" button ---
    const handleGeneratePassword = () => {
        const newPassword = generate({
            length: 14,
            numbers: true,
            symbols: true,
            strict: true,
        });
        // Update the form state with the new password
        setFormData(prev => ({ ...prev, password: newPassword }));
        // Temporarily show the password so the user can see it
        setShowPassword(true);
        toast.success("Strong password generated!");
    };

    return (
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center bg-base-200 p-4 py-12">
            <div className="card w-full max-w-md shadow-2xl bg-base-100">
                <form className="card-body" onSubmit={handleSubmit}>
                    <div className="form-control">
                        <label className="label block"><span className="label-text">Name</span></label>
                        <input type="text" name="name" placeholder="Your Name" className="input input-bordered w-full" required onChange={handleChange} value={formData.name} />
                    </div>
                    <div className="form-control">
                        <label className="label block"><span className="label-text">Email</span></label>
                        <input type="email" name="email" placeholder="your@email.com" className="input input-bordered w-full" required onChange={handleChange} value={formData.email} />
                    </div>                    
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Password</span>
                        </label>
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
                        
                        {/* --- Generate Password Button --- */}
                        <div className="text-right mt-1">
                             <button type="button" className="btn btn-ghost btn-xs text-primary" onClick={handleGeneratePassword}>
                                <FaMagic/> Generate Strong Password
                            </button>
                        </div>
                    </div>
                    <div className="divider">OR</div>
                    <a 
                        href={`${import.meta.env.VITE_API_BASE_URL}/auth/google`} 
                        className="btn btn-outline w-full"
                    >
                        <FaGoogle className="mr-2" />
                        Sign in with Google
                    </a>
                    <div className="form-control mt-4">
                        <button className="btn btn-primary" type="submit" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner"></span> : <FaUserPlus />}
                            Sign Up
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;