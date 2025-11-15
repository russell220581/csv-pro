import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 text-center p-4">
            <FaExclamationTriangle className="text-8xl text-warning mb-4" />
            <h1 className="text-5xl font-bold">404 - Page Not Found</h1>
            <p className="py-6">
                Sorry, the page you are looking for does not exist. It might have been moved or deleted.
            </p>
            <Link to="/app/dashboard" className="btn btn-primary">
                Go to Dashboard
            </Link>
        </div>
    );
};

export default NotFound;
