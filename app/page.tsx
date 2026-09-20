import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import { Features, HowItWorks, Platform, WhatsAppSection, Testimonials } from '@/components/landing/Sections';
import { Pricing, FAQ, FinalCTA, Footer } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <div className="bg-white">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Platform />
        <WhatsAppSection />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
