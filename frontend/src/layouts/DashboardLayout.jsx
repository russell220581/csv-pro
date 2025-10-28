import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import FeedbackWidget from '../components/common/FeedbackWidget';

const DashboardLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-base-200">
            <Header />                    
            <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
            <Footer />
            <FeedbackWidget />
        </div>
    );
};

export default DashboardLayout;
