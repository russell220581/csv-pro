import { Link } from 'react-router-dom';
import { FaFileCsv } from 'react-icons/fa';

const HeroSection = () => (
    <div className="hero min-h-[calc(100vh-80px)] bg-base-200">
        <div className="hero-content text-center">
            <div className="max-w-2xl">
                <FaFileCsv className="text-7xl text-primary mx-auto mb-6" />
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">The Effortless CSV Toolkit</h1>
                <p className="py-6 text-lg leading-8 text-base-content/80">
                    Stop fighting with spreadsheets. Clean, transform, and format your CSV files in seconds with our intuitive, powerful, and secure web-based tool. Built for everyone, from novices to data professionals.
                </p>
                <Link to="/signup" className="btn btn-primary btn-lg">Get Started for Free</Link>
                <p className="text-sm mt-4 text-base-content/60">No credit card required.</p>
            </div>
        </div>
    </div>
);

export default HeroSection;