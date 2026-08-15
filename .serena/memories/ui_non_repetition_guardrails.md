# Strict UI & Content Non-Repetition Guardrail

1. **Zero Repetition Rule**:
   - Never duplicate metrics, stats, or key data points across different sections of the same page (e.g. if attendee counts like "300+" or "2 tracks" are in MetricsBar/Hero, do NOT repeat them in SponsorSection, CFPSection, or Cards).
   - Never duplicate tier titles/roles inside component cards when the section or group header already declares it (e.g., if group title is "Venue Partner", do NOT put an inner badge "Official Venue Host" inside the card).
   - Never duplicate location strings or dates across multiple nested sub-elements if already stated prominently in the Hero/Header.
   - Keep each section focused strictly on its primary unique purpose (e.g., SponsorSection focuses on ROI & packages; SponsorsShowcase focuses purely on verified logos, names, and links without redundant descriptions or duplicate badges).

2. **Clean Sponsor Card Architecture**:
   - Reusable `SponsorGrid.tsx` must only display:
     * Tier Group Header (e.g. "Venue Partner", "Diamond Sponsors")
     * Seamless logo card with smooth contrast background, sponsor logo (`object-contain`), sponsor name, and external link icon.
     * No nested box-in-a-box frames, no redundant inner badges, no repetitive location subtitles.
     * Extensible for future sponsor tiers (venue, diamond, gold, silver, bronze, community, media).

3. **Color & Brand Consistency**:
   - Use AWS Brand Colors (#FF9900, orange-500, amber-400, slate-950) for all ComDay features. Avoid unrelated blue/purple gradients.