import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Mail, Copy, Check, Globe, Megaphone, Video, Award, Camera, Mic, Shirt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  communityDayEvent,
  computeSponsorTier,
  formatIDR,
  sanitizeSelection,
  sponsorAssets,
  sponsorContactEmail,
  STORAGE_KEY,
  type SponsorAsset,
  type SponsorTierId,
} from "@/components/sponsor/communityDayConfig";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATEGORY_GROUPS: { id: SponsorAsset["category"]; label: string }[] = [
  { id: "digital", label: "Digital & Media" },
  { id: "onsite", label: "On-Site & Physical" },
];

const ASSET_ICONS: Record<string, typeof Globe> = {
  "web-logo": Globe,
  "social-blast": Megaphone,
  "video-ad": Video,
  "email-footer": Mail,
  "tshirt": Shirt,
  "lanyard": Award,
  "backdrop": Camera,
  "mc-mention": Mic,
};

const TIER_BADGE_CLASS: Record<Exclude<SponsorTierId, "none">, string> = {
  platinum: "bg-gradient-to-r from-slate-100 via-zinc-200 to-slate-200 text-slate-900 border-none shadow-[0_0_12px_rgba(255,255,255,0.15)] font-bold",
  gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-amber-950 border-none shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold",
  silver: "bg-gradient-to-r from-slate-300 via-zinc-400 to-slate-400 text-zinc-950 border-none font-bold",
  supporter: "bg-gradient-to-r from-orange-400 via-primary to-orange-500 text-orange-950 border-none font-bold",
};

// ponytail: assets/tiers hardcoded in communityDayConfig. Promote to astro:content
// collection when a second event needs to reuse this configurator.

export function SponsorConfigurator() {
  const [selection, setSelection] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return sanitizeSelection(raw, sponsorAssets.map((a) => a.id));
    } catch {
      return {};
    }
  });
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "prepared">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // storage unavailable — keep in-memory state only
    }
  }, [selection]);

  const selectedAssets = useMemo(
    () => sponsorAssets.filter((a) => selection[a.id]),
    [selection],
  );
  const total = useMemo(
    () => selectedAssets.reduce((sum, a) => sum + a.price, 0),
    [selectedAssets],
  );
  const tier = useMemo(() => computeSponsorTier(total), [total]);

  const trimmedCompany = company.trim();
  const trimmedEmail = email.trim();
  const trimmedGoals = goals.trim();

  const summaryText = useMemo(() => {
    const lines: string[] = [
      `Sponsorship Package Request — ${trimmedCompany}`,
      "",
      `Event: ${communityDayEvent.name} (${communityDayEvent.date}, ${communityDayEvent.location})`,
      "",
      "Selected packages:",
      ...selectedAssets.map((a) => `- ${a.name} — ${formatIDR(a.price)}`),
      "",
      `Total: ${formatIDR(total)}`,
      `Tier: ${tier.label}`,
      "",
      `Company: ${trimmedCompany}`,
      `Email: ${trimmedEmail}`,
      `Goals: ${trimmedGoals || "(none provided)"}`,
    ];
    return lines.join("\n");
  }, [selectedAssets, total, tier, trimmedCompany, trimmedEmail, trimmedGoals]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trimmedCompany === "") {
      setFormError("Enter your company name to prepare your request.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormError("Enter a valid contact email to prepare your request.");
      return;
    }
    if (selectedAssets.length === 0) {
      setFormError("Select at least one package to prepare your request.");
      return;
    }
    setFormError(null);
    const encSubject = encodeURIComponent(`Sponsorship Package Request — ${trimmedCompany}`);
    const encBody = encodeURIComponent(summaryText);
    window.location.href = `mailto:${sponsorContactEmail}?subject=${encSubject}&body=${encBody}`;
    setSubmitState("prepared");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setClipboardError(null);
    } catch {
      setCopied(false);
      setClipboardError("copy-failed");
    }
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <header className="max-w-2xl mb-8 space-y-3">
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
            Build Your Package
          </h3>
          <p className="text-muted-foreground">
            Start from {formatIDR(2_500_000)}. Every partner earns a badge.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-10">
            {CATEGORY_GROUPS.map((group) => {
              const assets = sponsorAssets.filter((a) => a.category === group.id);
              if (assets.length === 0) return null;
              return (
                <div key={group.id} className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2 border-l-2 border-primary pl-3">
                    {group.label}
                  </h4>
                  <ul className="space-y-3">
                    {assets.map((a) => {
                      const Icon = ASSET_ICONS[a.id] || Award;
                      const isChecked = !!selection[a.id];
                      return (
                        <li key={a.id}>
                          <Label
                            htmlFor={a.id}
                            className={cn(
                              "flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 select-none",
                              isChecked
                                ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                : "border-border bg-card/40 hover:bg-accent/40"
                            )}
                          >
                            <div className="flex items-center h-5">
                              <Checkbox
                                id={a.id}
                                checked={isChecked}
                                onCheckedChange={(value) =>
                                  setSelection((prev) => ({ ...prev, [a.id]: value === true }))
                                }
                                className="cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center transition-colors",
                                  isChecked
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted/55 text-muted-foreground"
                                )}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-2">
                                  <div className="space-y-1 text-left">
                                    <span className="block font-medium text-foreground leading-snug">
                                      {a.name}
                                    </span>
                                    <span className="block text-xs text-muted-foreground leading-relaxed">
                                      {a.advantage}
                                    </span>
                                  </div>
                                  {/* Price stacked below description on mobile only */}
                                  <span className={cn(
                                    "sm:hidden block text-sm font-semibold",
                                    isChecked ? "text-primary" : "text-muted-foreground"
                                  )}>
                                    {formatIDR(a.price)}
                                  </span>
                                </div>
                              </div>
                              {/* Price aligned to right on desktop */}
                              <span className={cn(
                                "hidden sm:inline-block text-sm font-semibold whitespace-nowrap self-center",
                                isChecked ? "text-primary" : "text-muted-foreground"
                              )}>
                                {formatIDR(a.price)}
                              </span>
                            </div>
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-24 space-y-4">
            <Card id="sponsorship-form-card" className={cn(
              "transition-all duration-300",
              total > 0 && "border-primary/30 shadow-lg shadow-primary/5"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Your Sponsorship</CardTitle>
                  {tier.id !== "none" && (
                    <Badge
                      variant="outline"
                      className={cn("bg-transparent", TIER_BADGE_CLASS[tier.id])}
                    >
                      {tier.label}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {total === 0 ? "Select an asset" : formatIDR(total)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Package selections are requests, not reservations. Prices are indicative, subject to availability, and finalized by agreement.
                </p>
                <p className="text-xs text-amber-300 leading-relaxed">
                  No baseline package comes with automatic booths; booths can be added in subsequent phases upon venue capacity confirmation.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate={false}>
                  <div className="space-y-1.5">
                    <Label htmlFor="sponsor-company">Company Name</Label>
                    <Input
                      id="sponsor-company"
                      type="text"
                      required
                      maxLength={120}
                      autoComplete="organization"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sponsor-email">Contact Email</Label>
                    <Input
                      id="sponsor-email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sponsor-goals">Target Technical Goals</Label>
                      <span className="text-xs text-muted-foreground">{goals.length}/1000</span>
                    </div>
                    <Textarea
                      id="sponsor-goals"
                      rows={3}
                      maxLength={1000}
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                    />
                  </div>

                  {formError && (
                    <p className="text-sm text-destructive">{formError}</p>
                  )}

                  <Button type="submit" className="w-full">
                    <Mail aria-hidden="true" />
                    Prepare Sponsorship Email
                  </Button>
                </form>

                {submitState === "prepared" && (
                  <div
                    aria-live="polite"
                    className="space-y-3 rounded-lg border border-border p-4 bg-background"
                  >
                    <p className="text-sm text-foreground">
                      Email draft prepared. Send it from your email app to submit your package request.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCopy}
                    >
                      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      Copy Summary
                    </Button>
                    {clipboardError === "copy-failed" && (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive">
                          Clipboard unavailable. Copy the summary manually below.
                        </p>
                        <Textarea
                          readOnly
                          rows={10}
                          value={summaryText}
                          className="font-mono text-xs"
                          aria-label="Sponsorship request summary"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Or email us directly:{" "}
                      <a
                        href={`mailto:${sponsorContactEmail}`}
                        className="text-primary underline underline-offset-4 break-all"
                      >
                        {sponsorContactEmail}
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile */}
      {total > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-t border-border p-4 shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Package Request</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-foreground">{formatIDR(total)}</span>
                {tier.id !== "none" && (
                  <Badge className={cn("text-[9px] px-1.5 py-0 font-bold", TIER_BADGE_CLASS[tier.id])}>
                    {tier.label}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const element = document.getElementById("sponsorship-form-card");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 px-3 h-9 rounded-lg cursor-pointer"
            >
              Continue to Details
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
