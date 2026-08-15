import { Handshake, Download, FileText, Sparkles, Target, Briefcase, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SponsorSection() {
  const valuePillars = [
    {
      icon: Target,
      title: "Direct Brand Visibility",
      description: "Showcase your brand, developer tools, or cloud solutions to an engaged audience of active practitioners and tech decision-makers.",
    },
    {
      icon: Briefcase,
      title: "Talent & Engineering Hiring",
      description: "Connect with high-caliber cloud engineers, solutions architects, DevOps leads, and AI practitioners looking for their next opportunity.",
    },
    {
      icon: Sparkles,
      title: "Thought Leadership",
      description: "Lead technical breakout sessions, share real-world architectures, and position your company at the forefront of cloud innovation.",
    },
    {
      icon: Award,
      title: "Community Impact",
      description: "Support local tech talent development and demonstrate ongoing commitment to open learning in the Indonesian developer ecosystem.",
    },
  ];

  return (
    <section id="sponsors" className="py-24 px-4 bg-background border-b border-border relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute left-0 bottom-1/4 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-0 top-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-widest">
            🤝 Partner With Us
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Sponsorship & Collaboration
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mx-auto rounded-full" />
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Partner with AWS Community Day Jakarta to amplify your brand, hire top-tier engineering talent, and support the Indonesian tech community.
          </p>
        </div>

        {/* Value Pillars Grid (Non-repetitive, ROI focused) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {valuePillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-xl hover:shadow-black/20 group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-orange-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Callout Box */}
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-orange-500/[0.04] via-card/80 to-amber-500/[0.03] border border-orange-500/20 rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[64px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[64px] pointer-events-none" />

          <div className="space-y-3 text-center relative z-10 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center justify-center gap-2.5">
              <FileText className="h-7 w-7 text-orange-400 shrink-0" />
              Interested in Sponsoring?
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Explore our sponsorship tiers, customize modular add-ons with our live package configurator, or download the official sponsorship prospectus.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center items-center relative z-10">
            <Button
              asChild
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold py-6 px-8 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm sm:text-base w-full sm:w-auto"
            >
              <a href="/sponsors">
                <Handshake className="mr-2 h-5 w-5" />
                Explore Sponsorship Packages
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <Button
              variant="outline"
              className="bg-card/50 border-border hover:bg-muted text-foreground py-6 px-6 w-full sm:w-auto justify-center rounded-xl active:scale-95 transition-all text-sm sm:text-base font-medium"
              onClick={() => {
                const deckUrl = import.meta.env.PUBLIC_COMMUNITY_DAY_DECK_URL;
                window.open(
                  deckUrl && deckUrl !== "undefined"
                    ? deckUrl
                    : "/AWSUG_Jakarta_Sponsorship_Deck.pdf",
                  "_blank"
                );
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download Prospectus
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
