import { useState } from "react";
import { Handshake, Download, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function SponsorSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", company: "", email: "", tier: "gold" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const tiers = [
    {
      name: "Diamond",
      slots: "Sold Out",
      color: "border-cyan-500/50 text-cyan-400 bg-cyan-500/5",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      iconColor: "text-cyan-400",
      perks: ["15-min Keynote Slot", "Large Double Booth", "5 Free Passes", "Featured Logo Size"],
    },
    {
      name: "Gold",
      slots: "1 Slot Remaining",
      color: "border-amber-500/50 text-amber-400 bg-amber-500/5",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      iconColor: "text-amber-400",
      perks: ["10-min Speaking Slot", "Standard Booth", "3 Free Passes", "Medium Logo Size"],
    },
    {
      name: "Silver",
      slots: "Available",
      color: "border-border text-slate-300 bg-muted/10",
      badgeColor: "bg-muted/10 text-slate-300 border-border",
      iconColor: "text-slate-400",
      perks: ["Booth Space", "Shared Rollup Area", "2 Free Passes", "Small Logo Size"],
    },
    {
      name: "Community",
      slots: "Unlimited",
      color: "border-purple-500/30 text-purple-300 bg-purple-500/5",
      badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      iconColor: "text-purple-400",
      perks: ["Digital Logo Placement", "Community Swag Table", "1 Free Pass", "Logo on Website"],
    },
  ];

  const initialFormData = { name: "", company: "", email: "", tier: "gold" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // NOTE: This is a frontend-only mock. Wire to the backend API (jakarta-backend) when ready.
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setFormData(initialFormData);
      }, 2000);
    }, 1500);
  };

  return (
    <section id="sponsors" className="py-24 px-4 bg-background border-b border-border relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute left-0 bottom-1/4 w-[350px] h-[350px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-0 top-1/4 w-[300px] h-[300px] bg-orange-950/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/5 text-orange-400 text-xs font-semibold uppercase tracking-widest">
            🤝 Partner With Us
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Sponsorship & Collaboration
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 mx-auto rounded-full" />
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Connect your brand with over 1,000 cloud professionals, CTOs, engineers, developers, and builders in Indonesia. Engage directly with decision-makers.
          </p>
        </div>

        {/* Sponsor Tiers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 items-stretch">
          {tiers.map((tier, idx) => {
            const isGold = tier.name === "Gold";
            const isDiamond = tier.name === "Diamond";
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "rounded-3xl border p-6 flex flex-col justify-between space-y-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 relative group min-h-[300px]",
                  isGold 
                    ? "bg-card border-amber-500/30 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/10 lg:scale-[1.03] z-10" 
                    : "bg-card border-border hover:border-border/80",
                  isDiamond && "opacity-75"
                )}
              >
                {/* Featured Banner for Gold Package */}
                {isGold && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    ★ Featured Tier
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-orange-400 transition-colors">
                      {tier.name}
                    </h3>
                    <span className={cn(
                      "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0", 
                      tier.badgeColor
                    )}>
                      {tier.slots}
                    </span>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {tier.perks.map((perk, perkIdx) => (
                      <li key={perkIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className={cn("h-4.5 w-4.5 shrink-0 mt-0.5", tier.iconColor)} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prospectus & Register Box (Glassmorphic Redesign) */}
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-purple-500/[0.04] via-card/50 to-orange-500/[0.02] border border-purple-500/20 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[48px]" />
          
          <div className="space-y-3 text-center relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-orange-400" /> Interested in Sponsoring?
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Download our comprehensive sponsorship prospectus package to view all detailed booth layouts, marketing benefits, and tier configurations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center items-center relative z-10">
            <Button 
              variant="outline" 
              className="bg-transparent border-border hover:bg-muted text-foreground py-6 w-full sm:min-w-[200px] justify-center rounded-xl active:scale-95 transition-all text-sm font-medium"
              onClick={() => {
                const deckUrl = import.meta.env.PUBLIC_COMMUNITY_DAY_DECK_URL;
                window.open(deckUrl && deckUrl !== "undefined" ? deckUrl : "/AWSUG_Jakarta_Sponsorship_Deck.pdf", "_blank");
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download Prospectus
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-primary-foreground font-bold py-6 w-full sm:min-w-[200px] justify-center rounded-xl active:scale-95 transition-all text-sm">
                  <Handshake className="mr-2 h-4 w-4" /> Register Interest
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] bg-popover border-border text-foreground">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-orange-400" /> Sponsorship Inquiry
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm">
                    Leave your contact details and our team will get in touch with you shortly.
                  </DialogDescription>
                </DialogHeader>

                {isSuccess ? (
                  <div className="py-8 text-center space-y-3 flex flex-col items-center animate-in fade-in duration-300">
                    <CheckCircle2 className="h-14 w-14 text-emerald-400 animate-bounce" />
                    <h4 className="text-lg font-bold text-foreground">Interest Registered!</h4>
                    <p className="text-sm text-muted-foreground">Our Sponsorship lead will email you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm text-muted-foreground">Your Name</Label>
                      <Input
                        id="name"
                        required
                        className="bg-card border-border text-foreground focus-visible:ring-orange-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-sm text-muted-foreground">Company Name</Label>
                      <Input
                        id="company"
                        required
                        className="bg-card border-border text-foreground focus-visible:ring-orange-500"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm text-muted-foreground">Business Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        className="bg-card border-border text-foreground focus-visible:ring-orange-500"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tier" className="text-sm text-muted-foreground">Preferred Tier</Label>
                      <select
                        id="tier"
                        className="w-full bg-card border border-border rounded-md p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      >
                        <option value="gold">Gold Package</option>
                        <option value="silver">Silver Package</option>
                        <option value="community">Community Support Package</option>
                      </select>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-primary-foreground font-bold mt-2"
                    >
                      {isSubmitting ? "Sending Inquiry..." : "Submit Inquiry"}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </section>
  );
}
