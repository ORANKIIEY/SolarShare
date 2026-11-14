import { ChainDataProvider } from "@/components/chain/ChainData";
import Asset from "@/components/landing/Asset";
import Estimate from "@/components/landing/Estimate";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import { Faq, Partners, Risks, Who } from "@/components/landing/Info";
import Nav from "@/components/landing/Nav";
import SkipLink from "@/components/landing/SkipLink";
import Theft from "@/components/landing/Theft";
import Trust from "@/components/landing/Trust";

export default function Home() {
  return (
    <ChainDataProvider>
      <SkipLink />
      <Nav />
      <main id="main">
        <Hero />
        <Asset />
        <HowItWorks />
        <Trust />
        <Theft />
        <Estimate />
        <Risks />
        <Who />
        <Partners />
        <Faq />
      </main>
      <Footer />
    </ChainDataProvider>
  );
}
