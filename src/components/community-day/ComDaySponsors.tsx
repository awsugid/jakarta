import { SponsorGrid, type Sponsor } from "@/components/sponsors/SponsorGrid";

const COMDAY26_SPONSORS: Sponsor[] = [
  {
    name: "BINUS University",
    logo: "/assets/comday26/sponsors/binus.png",
    url: "https://binus.ac.id",
    tier: "venue",
  },
];

export function ComDaySponsors() {
  return (
    <SponsorGrid
      sponsors={COMDAY26_SPONSORS}
      title="Our Sponsors & Partners"
      subtitle="Supported by organizations driving cloud innovation in Indonesia."
      showBecomeSponsorCta={true}
    />
  );
}
