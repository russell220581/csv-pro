import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import PricingSection from '../components/landing/PricingSection';
import CTASection from '../components/landing/CTASection';

// --- The Main Landing Page Component ---
// This component now ONLY assembles the sections. It does not contain its own header or footer.
const LandingPage = () => {
    return (
        <main>
            <HeroSection />
            <FeaturesSection />
            <PricingSection />
            <CTASection />
        </main>
    );
};

export default LandingPage;