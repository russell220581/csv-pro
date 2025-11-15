import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {            
            toast.success('Successfully logged in!');
            // Redirect to dashboard - cookie authentication will work automatically
            navigate('/app/dashboard', { replace: true });
        } else {
            toast.error('Authentication failed. Please try again.');
            navigate('/login', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <Spinner message="Finalizing your login..." size="lg" />
        </div>
    );
};

export default AuthSuccess;