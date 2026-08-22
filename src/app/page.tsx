import { CtaBanner } from "@/components/landing/cta-banner";
import { EligibilityInvestment } from "@/components/landing/eligibility-investment";
import { EnquiryForm } from "@/components/landing/enquiry-form";
import { Faq } from "@/components/landing/faq";
import { FeeBanner } from "@/components/landing/fee-banner";
import { FranchisePlans } from "@/components/landing/franchise-plans";
import { Flavours } from "@/components/landing/flavours";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StatsBar } from "@/components/landing/stats-bar";
import { Testimonials } from "@/components/landing/testimonials";
import { WhoDoesWhat } from "@/components/landing/who-does-what";
import { WhyPartner } from "@/components/landing/why-partner";
import { SmoothScroll } from "@/components/motion/smooth-scroll";

export default function HomePage() {
  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="main" className="flex-1">
        <Hero />
        <StatsBar />
        <WhyPartner />
        <HowItWorks />
        <FranchisePlans />
        <WhoDoesWhat />
        <FeeBanner />
        <EligibilityInvestment />
        <Flavours />
        <Testimonials />
        <EnquiryForm />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
