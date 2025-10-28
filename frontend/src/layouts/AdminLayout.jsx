import { Outlet, NavLink } from 'react-router-dom';
import Header from '../components/common/Header';
import { FaShieldAlt, FaUsers, FaComments, FaArrowLeft } from 'react-icons/fa';

const AdminSidebar = () => {
    const adminNavLinks = [
        { to: '/admin/dashboard', icon: <FaShieldAlt />, label: 'Overview' },
        { to: '/admin/users', icon: <FaUsers />, label: 'User Management' },
        { to: '/admin/feedback', icon: <FaComments />, label: 'User Feedback' },
    ];
    return (
        <aside className="w-64 bg-base-300 text-base-content flex flex-col">
            <div className="p-4 flex items-center justify-center h-16 border-b border-base-100/10">
                <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
            </div>
            <ul className="menu p-4 flex-grow text-base">
                {adminNavLinks.map(link => (
                    <li key={link.to}><NavLink to={link.to} className={({ isActive }) => isActive ? 'active' : ''}>{link.icon}{link.label}</NavLink></li>
                ))}
                 <div className="divider"></div>
                 <li><NavLink to="/app/dashboard"><FaArrowLeft /> Back to App</NavLink></li>
            </ul>
        </aside>
    );
};

const AdminLayout = () => {
    return (
        <div className="flex h-screen bg-base-100">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-base-200">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;