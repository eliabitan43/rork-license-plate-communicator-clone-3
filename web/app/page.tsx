import {
  ActionsMarquee,
  DownloadSection,
  FleetCta,
  Footer,
  Header,
  Hero,
  HowItWorks,
  MapTeaser,
} from "@/components/marketing/Sections";

// Marketing page is fully static — only the token page is dynamic.
export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <ActionsMarquee />
        <MapTeaser />
        <FleetCta />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}
