#!/usr/bin/env python3
"""Assert /comday section order: Tickets sits after Schedule + Speakers, before Sponsors.

Two layers:
- src/pages/comday.astro marker order (SpeakersCarousel is SSR-null while loading,
  so #speakers never exists in static HTML)
- dist/comday/index.html id order for statically rendered sections
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent

SRC_MARKERS = [
    "ComDayHero",
    'id="agenda"',
    "SpeakerCarousel",
    'id="tickets"',
    "SponsorSection",
    "ComDaySponsors",
    "VolunteerCallSection",
    'id="team"',
    "CFPSection",
    'id="faq"',
]

HTML_IDS = ["overview", "agenda", "tickets", "sponsors", "volunteers", "team", "cfp", "faq"]

src = (root / "src/pages/comday.astro").read_text(encoding="utf-8").split("---", 2)[2]  # skip frontmatter imports
pos = {m: src.index(m) for m in SRC_MARKERS}
for a, b in zip(SRC_MARKERS, SRC_MARKERS[1:]):
    assert pos[a] < pos[b], f"source: {a} must come before {b}"

html = (root / "dist/comday/index.html").read_text(encoding="utf-8")
ids = re.findall(r'<section[^>]+id="([a-z]+)"', html)
hpos = {sid: ids.index(sid) for sid in HTML_IDS}
for a, b in zip(HTML_IDS, HTML_IDS[1:]):
    assert hpos[a] < hpos[b], f"dist: #{a} must come before #{b} — got {ids}"

assert html.count('id="tickets"') == 1, "#tickets anchor must exist exactly once (nav + sticky bar link target)"
assert 'href="#tickets"' in html, "mobile sticky bar registration link must target #tickets"

print(f"OK: source order {SRC_MARKERS}")
print(f"OK: dist section order {ids}")
