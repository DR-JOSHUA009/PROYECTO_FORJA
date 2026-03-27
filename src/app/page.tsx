import Hero from "@/components/landing/Hero";
import dynamic from "next/dynamic";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";

// Lazy loading heavy components that are below the fold
const Differentiators = dynamic(() => import("@/components/landing/Differentiators"));
const MockupsScroll = dynamic(() => import("@/components/landing/MockupsScroll"));
const Marquee = dynamic(() => import("@/components/landing/Marquee"));
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"));
const Reviews = dynamic(() => import("@/components/landing/Reviews"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));
const Footer = dynamic(() => import("@/components/landing/Footer"));

export default function Home() {
  return (
    <SmoothScrollProvider>
      <main className="min-h-screen bg-background flex flex-col items-center">
        <Hero />
        <div id="como-funciona" className="w-full">
          <Differentiators />
        </div>
        <MockupsScroll />
        <Marquee />
        <HowItWorks />
        <Reviews />
        <Pricing />
        <Footer />
      </main>
    </SmoothScrollProvider>
  );
}
