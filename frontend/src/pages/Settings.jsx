import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import { FaUserEdit, FaKey, FaEye, FaCreditCard, FaRocket } from 'react-icons/fa';

const ProfileForm = ({ user, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [isLoading, setIsLoading] = useState(false);
    const canSave = name !== user.name && name.trim() !== '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data } = await api.put('/auth/updatedetails', { name });
            if (data.success) {
                toast.success('Profile updated successfully!');
                onUpdate(data.data); // Update parent state
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-xl"><FaUserEdit className="text-primary" /> Profile Information</h2>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="form-control">
                        <label className="label block"><span className="label-text">Name</span></label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered w-full" />
                    </div>
                    <div className="form-control">
                        <label className="label block"><span className="label-text">Email</span></label>
                        <input type="email" value={user.email} className="input input-bordered w-full" disabled />
                    </div>
                    <div className="card-actions justify-end">
                        <button type="submit" className="btn btn-primary" disabled={!canSave || isLoading}>
                            {isLoading && <span className="loading loading-spinner"></span>}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PasswordForm = () => {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    // Add state for visibility toggles
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) return toast.error('New passwords do not match.');
        setIsLoading(true);
        try {
            const { data } = await api.put('/auth/updatepassword', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
            if (data.success) {
                toast.success('Password updated successfully!');
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-xl"><FaKey className="text-primary" /> Change Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    
                    <div className="form-control">
                        <label className="label"><span className="label-text">Current Password</span></label>
                        <div className="relative">
                            <input type={showCurrent ? 'text' : 'password'} name="currentPassword" value={passwords.currentPassword} onChange={handleChange} className="input input-bordered w-full pr-10" required />
                            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowCurrent(!showCurrent)}>
                                {showCurrent ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">New Password</span></label>
                        <div className="relative">
                            <input type={showNew ? 'text' : 'password'} name="newPassword" value={passwords.newPassword} onChange={handleChange} className="input input-bordered w-full pr-10" required />
                            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowNew(!showNew)}>
                                {showNew ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">Confirm New Password</span></label>
                        <div className="relative">
                            <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} className="input input-bordered w-full pr-10" required />
                             <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="card-actions justify-end">
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading && <span className="loading loading-spinner"></span>}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SubscriptionPanel = ({ user }) => {
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleUpgradeClick = async () => {
        setIsRedirecting(true);
        const toastId = toast.loading('Redirecting to checkout...');
        try {
            const { data } = await api.post('/stripe/create-checkout-session');
            if (data.success && data.url) {
                toast.dismiss(toastId);
                window.location.href = data.url; // Redirect to Stripe
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not initiate checkout.', { id: toastId });
            setIsRedirecting(false);
        }
    };
    
    const handleManageBillingClick = async () => {
        setIsRedirecting(true);
        const toastId = toast.loading('Redirecting to billing portal...');
        try {
            const { data } = await api.post('/stripe/create-portal-session');
            if (data.success && data.url) {
                toast.dismiss(toastId);
                window.location.href = data.url; // Redirect to Stripe Customer Portal
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not open billing portal.', { id: toastId });
            setIsRedirecting(false);
        }
    };

    if (user.plan === 'premium') {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title text-xl"><FaCreditCard className="text-primary" /> Subscription Management</h2>
                    <p className="mt-4">You are currently on the <span className="badge badge-success font-bold">Premium Plan</span>.</p>
                    <p className="text-sm text-base-content/70">Update your payment method, view invoices, or cancel your subscription at any time.</p>
                    <div className="card-actions justify-end mt-4">
                        <button className="btn btn-secondary" onClick={handleManageBillingClick} disabled={isRedirecting}>
                            {isRedirecting && <span className="loading loading-spinner"></span>}
                            Manage Billing & Invoices
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Free User View
    return (
        <div className="card bg-base-100 shadow-xl border-2 border-accent">
            <div className="card-body items-center text-center">
                <FaRocket className="text-accent text-4xl" />
                <h2 className="card-title text-2xl">Upgrade to Premium!</h2>
                <p>Unlock all features and take your data cleaning to the next level.</p>
                <ul className="text-sm my-4 space-y-2">
                    <li>✔️ Unlimited Jobs</li>
                    <li>✔️ Up to 100MB File Size</li>
                    <li>✔️ All Premium Cleaning Features</li>
                </ul>
                <div className="card-actions justify-center mt-4">
                    <button className="btn btn-accent btn-lg" onClick={handleUpgradeClick} disabled={isRedirecting}>
                         {isRedirecting && <span className="loading loading-spinner"></span>}
                        Upgrade Now
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Settings Page ---
const Settings = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await api.get('/auth/me');
                if (data.success) setUser(data.data);
            } catch (error) {
                toast.error("Could not load user data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (isLoading) return <Spinner message="Loading your settings..." size="lg" />;
    if (!user) return <div>Could not load user settings. Please try again.</div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl font-bold">Account Settings</h1>
            <ProfileForm user={user} onUpdate={setUser} />
            <PasswordForm />
            <SubscriptionPanel user={user} />
        </div>
    );
};

export default Settings;