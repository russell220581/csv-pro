import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { FaStar, FaRocket, FaCheckCircle } from 'react-icons/fa';
import Spinner from '../common/Spinner';

const UserStatusBanner = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (data.success) {
                    setUser(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch user status", error);
                // Handle error gracefully, maybe show a generic message or nothing
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (isLoading) {
        return (
            <div className="card">
                <div className="card-body">
                    <Spinner message="Loading user data..." size="sm" />
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Don't render anything if user data couldn't be fetched
    }

    // --- Premium User View ---
    if (user.plan === 'premium') {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body flex-col sm:flex-row justify-between items-center">
                    <div>
                        <h2 className="card-title text-2xl">Welcome back, {user.name}!</h2>
                        <p className="flex items-center gap-2 mt-1">
                            <span className="badge badge-success gap-2">
                                <FaStar />
                                Premium Plan
                            </span>
                            <span>Thank you for your support!</span>
                        </p>
                    </div>
                    <div className="card-actions mt-4 sm:mt-0">
                        <Link to="/app/settings" className="btn btn-ghost">Manage Billing</Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- Free User View ---
    const quotaPercentage = (user.monthlyJobCount / 10) * 100;

    return (        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-8 lg:pb-12">
            {/* Left side: Greeting and Quota */}
            <div>
                <h2 className="card-title text-2xl md:text-4xl font-bold">Welcome, {user.name}</h2>
                <p className="mt-4">You are currently on the Free Plan.</p>
                <div className="mt-4">
                    <label className="label">
                        <span className="label-text">Monthly Job Quota</span>
                        <span className="label-text-alt font-bold">{user.monthlyJobCount} / 10 Jobs Used</span>
                    </label>
                    <progress className="progress progress-primary w-full" value={quotaPercentage} max="100"></progress>
                </div>
            </div>
            {/* Right side: Upgrade CTA */}
            <div className="bg-base-100 p-8 rounded-lg text-center md:text-left">
                <h3 className="font-bold text-lg flex items-center gap-2 justify-center md:justify-start">
                    <FaRocket className="text-accent" />
                    Unlock Your Full Potential
                </h3>
                <ul className="text-sm my-4 space-y-2 text-base-content/80">
                    <li className="flex items-center gap-2"><FaCheckCircle className="text-success" /> Unlimited Jobs</li>
                    <li className="flex items-center gap-2"><FaCheckCircle className="text-success" /> Up to 100MB File Size</li>
                    <li className="flex items-center gap-2"><FaCheckCircle className="text-success" /> No Download Restrictions</li>
                </ul>
                <Link to="/app/settings" className="btn btn-accent">Upgrade to Premium</Link>
            </div>
        </div>
           
    );
};

export default UserStatusBanner;