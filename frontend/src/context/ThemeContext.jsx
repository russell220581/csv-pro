import { createContext, useState, useEffect } from 'react';

// 1. Create the context
export const ThemeContext = createContext();

// 2. Create the provider component
export const ThemeProvider = ({ children }) => {
    // State to hold the current theme. We get the initial value from localStorage or default to 'light'
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        // Apply the theme to the html tag whenever the theme state changes
        document.documentElement.setAttribute('data-theme', theme);
        // Save the theme preference to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Provide the theme and toggleTheme function to all child components
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
