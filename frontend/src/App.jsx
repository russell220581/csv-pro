import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';

// Import all necessary components and pages
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import EmailVerify from './pages/auth/EmailVerify';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import FeedbackViewer from './pages/admin/FeedbackViewer';
import Dashboard from './pages/Dashboard';
import JobHistory from './pages/JobHistory';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AuthSuccess from './pages/auth/AuthSuccess';

const PublicLayout = () => (
    <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow"><Outlet /></main>
        <Footer />
    </div>
);

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return !token ? children : <Navigate to="/app/dashboard" replace />;
};

const AdminRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/auth/me').then(res => {
            if (res.data.success && res.data.data.role === 'admin') {
                setIsAdmin(true);
            }
        }).catch(() => {
            setIsAdmin(false);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return <div>Loading...</div>; // Or a spinner
    }
    return isAdmin ? children : <Navigate to="/app/dashboard" />;
};

function App() {
    return (
        <>
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            <Router>
                <Routes>
                    <Route path="/auth/success" element={<AuthSuccess />} />
                    <Route path="/email-verification/:id/:token" element={<EmailVerify />} />

                    {/* Public routes use the local PublicLayout */}
                    <Route element={<PublicLayout />}>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                        <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                        <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<UserManagement />} />
                        <Route path="/admin/feedback" element={<FeedbackViewer />} />
                    </Route>

                    {/* Private routes now use the external DashboardLayout */}
                    <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                        <Route path="/app" element={<Navigate to="/app/dashboard" />} />
                        <Route path="/app/dashboard" element={<Dashboard />} />
                        <Route path="/app/history" element={<JobHistory />} />
                        <Route path="/app/settings" element={<Settings />} />
                    </Route>
                    
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;