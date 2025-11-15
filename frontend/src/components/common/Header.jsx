import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import { ThemeContext } from '../../context/ThemeContext.jsx';
import { FaCog, FaSignOutAlt, FaFileCsv, FaSun, FaMoon, FaTachometerAlt, FaHistory, FaShieldAlt } from 'react-icons/fa';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);
    return (
        <label className="swap swap-rotate btn btn-ghost btn-circle">
            <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
            <FaSun className="swap-on fill-current w-5 h-5" />
            <FaMoon className="swap-off fill-current w-5 h-5" />
        </label>
    );
};

const Header = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data } = await api.get('/auth/verify');
                if (data.success) {
                    setUser(data.data);
                }
            } catch (error) {
                console.error("User not authenticated", error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            setUser(null);
            window.location.href = '/login';
        }
    };

    if (isLoading) {
        return (
            <header className="navbar bg-base-100 sticky top-0 z-30 shadow-sm border-b border-base-300 px-4 sm:px-6 lg:px-8">
                <div className="navbar-start">
                    <Link to="/" className="btn btn-ghost text-xl">
                        <FaFileCsv className="text-primary" />
                        <span className="font-bold">CSV Pro</span>
                    </Link>
                </div>
                <div className="navbar-end">
                    <div className="skeleton h-8 w-8 rounded-full"></div>
                </div>
            </header>
        );
    }

    return (
        <header className="navbar bg-base-100 sticky top-0 z-30 shadow-sm border-b border-base-300 px-4 sm:px-6 lg:px-8">
            <div className="navbar-start">
                <Link to={user ? "/app/dashboard" : "/"} className="btn btn-ghost text-xl">
                    <FaFileCsv className="text-primary" />
                    <span className="font-bold">CSV Pro</span>
                </Link>
            </div>
            <div className="navbar-end gap-2">
                <ThemeToggle />
                {user ? (
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-primary btn-circle avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full h-8 w-8 pb-1">
                                <span className="text-xl">{user.name.charAt(0).toUpperCase()}</span>
                            </div>
                        </label>
                        <ul tabIndex={0} className="mt-3 p-2 shadow menu menu-md dropdown-content bg-base-100 rounded-box w-60 z-[1]">
                            <li className="menu-title"><span>Welcome, {user.name}</span></li>
                            <li><Link to="/app/dashboard"><FaTachometerAlt /> Dashboard</Link></li>
                            <li><Link to="/app/history"><FaHistory /> Job History</Link></li>
                            
                            {user.role === 'admin' && (
                                <>
                                    <div className="divider my-1"></div>
                                    <li className="menu-title"><span className="text-warning">Admin</span></li>
                                    <li><Link to="/admin/dashboard"><FaShieldAlt className="text-warning" /> Admin Dashboard</Link></li>
                                </>
                            )}
                            
                            <div className="divider my-1"></div>
                            <li><Link to="/app/settings"><FaCog /> Settings</Link></li>
                            <li><a onClick={handleLogout}><FaSignOutAlt /> Logout</a></li>
                        </ul>
                    </div>
                ) : (
                    <>
                        <Link to="/login" className="btn btn-ghost">Login</Link>
                        <Link to="/signup" className="btn btn-primary">Sign Up</Link>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;