const Spinner = ({ size = 'md', message = 'Loading...' }) => {
    const sizeClasses = {
        xs: 'loading-xs',
        sm: 'loading-sm',
        md: 'loading-md',
        lg: 'loading-lg',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
            <span className={`loading loading-spinner ${sizeClasses[size]}`}></span>
            {message && <p className="text-sm">{message}</p>}
        </div>
    );
};

export default Spinner;
