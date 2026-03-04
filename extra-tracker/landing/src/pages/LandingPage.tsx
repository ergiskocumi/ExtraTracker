import React from 'react';
import Header from '../sections/Header';
import HeroSection from '../sections/HeroSection';
import TrustedBySection from '../sections/TrustedBySection';
import FeaturesSection from '../sections/FeaturesSection';
import HowItWorksSection from '../sections/HowItWorksSection';
import DemoSection from '../sections/DemoSection';
import TestimonialsSection from '../sections/TestimonialsSection';
import PricingSection from '../sections/PricingSection';
import FAQSection from '../sections/FAQSection';
import CTASection from '../sections/CTASection';
import FooterSection from '../sections/FooterSection';

export interface LandingPageProps {
  useRouterLinks?: boolean;
  appUrl?: string;
}

// Error boundary for section components
class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; sectionName: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; sectionName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`Error in section ${this.props.sectionName}:`, error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null; // Silently fail for sections
    }
    return this.props.children;
  }
}

const LandingPage: React.FC<LandingPageProps> = ({ appUrl, useRouterLinks }) => {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
      <SectionErrorBoundary sectionName="Header">
        <Header appUrl={appUrl} useRouterLinks={useRouterLinks} />
      </SectionErrorBoundary>

      <main>
        <SectionErrorBoundary sectionName="HeroSection">
          <HeroSection appUrl={appUrl} useRouterLinks={useRouterLinks} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="TrustedBySection">
          <TrustedBySection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="FeaturesSection">
          <FeaturesSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="HowItWorksSection">
          <HowItWorksSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="DemoSection">
          <DemoSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="TestimonialsSection">
          <TestimonialsSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="PricingSection">
          <PricingSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="FAQSection">
          <FAQSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="CTASection">
          <CTASection appUrl={appUrl} />
        </SectionErrorBoundary>
      </main>

      <SectionErrorBoundary sectionName="FooterSection">
        <FooterSection />
      </SectionErrorBoundary>
    </div>
  );
};

export default LandingPage;
