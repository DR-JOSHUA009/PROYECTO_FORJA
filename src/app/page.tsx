import Hero from "@/components/landing/Hero";
import Differentiators from "@/components/landing/Differentiators";
import MockupsScroll from "@/components/landing/MockupsScroll";
import Marquee from "@/components/landing/Marquee";
import HowItWorks from "@/components/landing/HowItWorks";
import Reviews from "@/components/landing/Reviews";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
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
  );
}
