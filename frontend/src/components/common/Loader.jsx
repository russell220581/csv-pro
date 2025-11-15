import { FaSpinner } from 'react-icons/fa';

const Loader = ({ size = 'lg', text = 'Loading...', overlay = false }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10', 
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    if (overlay) {
        return (
            <div className="fixed inset-0 bg-base-100 bg-opacity-80 z-50 flex flex-col items-center justify-center">
                <div className={`animate-spin ${sizeClasses[size]} text-primary mb-4`}>
                    <FaSpinner className="w-full h-full" />
                </div>
                <p className="text-lg font-medium text-base-content">{text}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className={`animate-spin ${sizeClasses[size]} text-primary mb-4`}>
                <FaSpinner className="w-full h-full" />
            </div>
            <p className="text-lg font-medium text-base-content">{text}</p>
        </div>
    );
};

export default Loader;