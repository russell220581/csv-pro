import { Link } from 'react-router-dom';

const CTASection = () => (
     <div className="py-20 bg-base-200">
        <div className="container mx-auto px-6 text-center">
             <h2 className="text-4xl font-bold mb-8 tracking-tight">Ready to Tame Your Data?</h2>
             <Link to="/signup" className="btn btn-primary btn-lg">Sign Up Now & Get 10 Free Jobs</Link>
        </div>
    </div>
);

export default CTASection;