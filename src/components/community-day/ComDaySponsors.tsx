import React from "react";
import { SponsorGrid } from "@/components/sponsors/SponsorGrid";
import { COMDAY26_SPONSORS } from "@/data/sponsors";

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
