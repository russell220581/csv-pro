import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <label className="swap swap-rotate btn btn-ghost btn-circle">
            {/* this hidden checkbox controls the state */}
            <input 
                type="checkbox" 
                onChange={toggleTheme}
                checked={theme === 'dark'}
            />
            {/* sun icon */}
            <FaSun className="swap-on fill-current w-5 h-5" />
            {/* moon icon */}
            <FaMoon className="swap-off fill-current w-5 h-5" />
        </label>
    );
};

export default ThemeToggle;