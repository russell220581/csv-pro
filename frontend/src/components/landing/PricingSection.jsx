import { Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

// A reusable sub-component for a feature list item
const FeatureListItem = ({ children, included = true }) => (
    <li className="flex items-center gap-3">
        {included ? (
            <FaCheckCircle className="text-success flex-shrink-0" />
        ) : (
            <FaTimesCircle className="text-base-content/30 flex-shrink-0" />
        )}
        <span className={!included ? 'text-base-content/50' : ''}>{children}</span>
    </li>
);


const PricingSection = () => {
    return (
        <div className="py-20 bg-base-200">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-4xl font-bold mb-4 tracking-tight">Choose the Plan That's Right for You</h2>
                <p className="text-lg mb-12 max-w-3xl mx-auto text-base-content/70">
                    Start for free, and upgrade when you need more power.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">

                    {/* Free Plan Card */}
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body p-8 items-center text-center">
                            <h3 className="card-title text-2xl">Free</h3>
                            <p className="text-4xl font-bold my-4">$0 <span className="text-lg font-normal text-base-content/60">/ month</span></p>
                            <p className="min-h-[48px] text-base-content/70">For casual users and small, one-off cleaning tasks.</p>
                            <div className="divider my-4"></div>
                            <ul className="space-y-3 text-left w-full">
                                <FeatureListItem>10 Jobs per month</FeatureListItem>
                                <FeatureListItem>5MB File Size Limit</FeatureListItem>
                                <FeatureListItem>Standard Cleaning Operations</FeatureListItem>
                                <FeatureListItem included={false}>Advanced Transformations</FeatureListItem>
                                <FeatureListItem included={false}>Priority Support</FeatureListItem>
                            </ul>
                            <div className="card-actions w-full mt-6">
                                <Link to="/signup" className="btn btn-outline btn-primary w-full">Get Started for Free</Link>
                            </div>
                        </div>
                    </div>

                    {/* Premium Plan Card (Highlighted) */}
                    <div className="card bg-base-100 shadow-2xl border-2 border-primary relative">
                         <div className="badge badge-primary absolute -top-4 right-4 font-bold">MOST POPULAR</div>
                        <div className="card-body p-8 items-center text-center">
                            <h3 className="card-title text-2xl text-primary">Premium</h3>
                            <p className="text-4xl font-bold my-4">$15 <span className="text-lg font-normal text-base-content/60">/ month</span></p>
                            <p className="min-h-[48px] text-base-content/70">For professionals and users with large or complex datasets.</p>
                            <div className="divider my-4"></div>
                            <ul className="space-y-3 text-left w-full">
                                <FeatureListItem>Unlimited Jobs</FeatureListItem>
                                <FeatureListItem>100MB File Size Limit</FeatureListItem>
                                <FeatureListItem>All Cleaning Operations</FeatureListItem>
                                <FeatureListItem>All Advanced Transformations</FeatureListItem>
                                <FeatureListItem>Priority Support</FeatureListItem>
                            </ul>
                            <div className="card-actions w-full mt-6">
                                <Link to="/signup" className="btn btn-primary w-full">Go Pro</Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PricingSection;