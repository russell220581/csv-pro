import { FaMagic, FaShieldAlt, FaBolt } from 'react-icons/fa';

const Feature = ({ icon, title, description }) => (
    <div className="card bg-base-100 shadow-xl text-center p-6 transition-transform hover:-translate-y-2">
        <div className="text-5xl text-primary mx-auto mb-4">{icon}</div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-base-content/70">{description}</p>
    </div>
);

// --- Sub-component for the "Features" section ---
const FeaturesSection = () => (
    <div className="py-20 bg-base-100">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Powerful Features, Radical Simplicity</h2>
            <p className="text-lg mb-12 max-w-3xl mx-auto text-base-content/70">We've hidden the complexity so you can focus on your data.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Feature 
                    icon={<FaMagic />} 
                    title="Intuitive Cleaning" 
                    description="Remove columns, change case, filter rows, and more with simple clicks. See your changes instantly with our live preview."
                />
                <Feature 
                    icon={<FaBolt />} 
                    title="Blazing Fast & Scalable" 
                    description="Our asynchronous backend processes huge files (up to 100MB) in the background without freezing your browser."
                />
                <Feature 
                    icon={<FaShieldAlt />} 
                    title="Secure & Private" 
                    description="Your files are your own. We process them securely and provide time-limited download links. Your privacy is our priority."
                />
            </div>
        </div>
    </div>
);

export default FeaturesSection;