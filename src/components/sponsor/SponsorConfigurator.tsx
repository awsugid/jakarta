import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Mail,
  Copy,
  Check,
  Globe,
  Megaphone,
  Video,
  Award,
  Camera,
  Mic,
  Shirt,
  RefreshCw,
  Calculator,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchSponsorPackages } from "@/lib/api";
import type {
  SponsorPackage,
  SponsorPackageGroup,
  SponsorTier,
  SponsorTierAccent,
} from "@/lib/types";

import {
  COMMUNITY_DAY_EVENT_SLUG,
  DEFAULT_USD_EXCHANGE_RATE,
  buildSponsorSections,
  communityDayEvent,
  formatIDR,
  formatPackagePrice,
  formatUsdAmount,
  hasRateDerivedUsd,
  isSoldOut,
  maxSponsorsOf,
  minimumSpendOf,
  packagePriceParts,
  packageUsdPrice,
  parseStoredSelection,
  remainingSponsorSlots,
  resolveEffectiveSelection,
  resolveSponsorTier,
  nextSponsorTier,
  sanitizeSelection,
  sponsorContactEmail,
  sumUsd,
  tierBudgetPresets,
  tierThreshold,
  tierThresholdUsd,
  STORAGE_KEY,
} from "@/components/sponsor/communityDayConfig";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const TIER_BADGE_CLASS: Record<SponsorTierAccent, string> = {
  platinum: "bg-gradient-to-r from-slate-100 via-zinc-200 to-slate-200 text-slate-900 border-none shadow-[0_0_12px_rgba(255,255,255,0.15)] font-bold",
  gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-amber-950 border-none shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold",
  silver: "bg-gradient-to-r from-slate-300 via-zinc-400 to-slate-400 text-zinc-950 border-none font-bold",
  bronze: "bg-gradient-to-r from-orange-700 via-amber-700 to-orange-800 text-orange-50 border-none font-bold",
  default: "bg-gradient-to-r from-orange-400 via-primary to-orange-500 text-orange-950 border-none font-bold",
};

type LoadStatus = "loading" | "ready" | "error";

export function SponsorConfigurator() {
  const [packages, setPackages] = useState<SponsorPackage[] | null>(null);
  const [groups, setGroups] = useState<SponsorPackageGroup[] | null>(null);
  const [tiers, setTiers] = useState<SponsorTier[] | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_USD_EXCHANGE_RATE);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryTick, setRetryTick] = useState(0);

  // Currency & Budget state
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");
  const [budgetInput, setBudgetInput] = useState<string>("");

  const [selection, setSelection] = useState<Record<string, boolean>>(() => {
    try {
      return parseStoredSelection(localStorage.getItem(STORAGE_KEY));
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

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchSponsorPackages(COMMUNITY_DAY_EVENT_SLUG)
      .then((response) => {
        if (cancelled) return;
        setPackages(response.packages);
        setGroups(response.groups);
        setTiers(response.tiers);
        setExchangeRate(response.usdExchangeRate ?? DEFAULT_USD_EXCHANGE_RATE);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  useEffect(() => {
    if (status !== "ready" || !packages) return;
    setSelection((prev) => sanitizeSelection(prev, packages.map((p) => p.id)));
  }, [status, packages]);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // storage unavailable
    }
  }, [selection]);

  const effectiveSelection = useMemo(
    () => resolveEffectiveSelection(packages ?? [], selection),
    [packages, selection],
  );

  const selectedPackages = useMemo(
    () => (packages ?? []).filter((p) => effectiveSelection[p.id]),
    [packages, effectiveSelection],
  );
  const total = useMemo(
    () => selectedPackages.reduce((sum, p) => sum + p.priceIdr, 0),
    [selectedPackages],
  );
  const totalUsd = useMemo(
    () => sumUsd(selectedPackages, exchangeRate),
    [selectedPackages, exchangeRate],
  );
  const totalUsdIsEstimate = hasRateDerivedUsd(selectedPackages);
  // Tier math runs in the active currency: USD compares the override-aware
  // USD total against effective USD thresholds (manual thresholdUsd wins over
  // thresholdIdr/rate); IDR is unchanged.
  const totalInCurrency = currency === "USD" ? totalUsd : total;
  const tier = useMemo(
    () => resolveSponsorTier(totalInCurrency, tiers ?? [], currency, exchangeRate),
    [totalInCurrency, tiers, currency, exchangeRate],
  );
  const nextTier = useMemo(
    () => nextSponsorTier(totalInCurrency, tiers ?? [], currency, exchangeRate),
    [totalInCurrency, tiers, currency, exchangeRate],
  );

  const tierProgress = useMemo(() => {
    if (!nextTier) return 0;
    const start = tier ? tierThreshold(tier, currency, exchangeRate) : 0;
    const span = tierThreshold(nextTier, currency, exchangeRate) - start;
    if (span <= 0) return 100;
    return Math.min(100, Math.max(0, ((totalInCurrency - start) / span) * 100));
  }, [nextTier, tier, totalInCurrency, currency, exchangeRate]);

  const startFromPackage = useMemo(() => {
    const eligible = (packages ?? []).filter(
      (p) => p.isUnlocked && !isSoldOut(p) && minimumSpendOf(p) === null,
    );
    if (eligible.length === 0) return null;
    const key = (p: (typeof eligible)[number]) =>
      currency === "USD" ? packageUsdPrice(p, exchangeRate) : p.priceIdr;
    return eligible.reduce((a, b) => (key(b) < key(a) ? b : a));
  }, [packages, currency, exchangeRate]);

  // Budget value in active-currency units (USD budgets compare against the
  // override-aware USD total, not total/rate).
  const targetBudget = useMemo(() => {
    const raw = budgetInput.trim();
    if (!raw) return null;
    const val = parseFloat(raw.replace(/,/g, ""));
    if (isNaN(val) || val <= 0) return null;
    return val;
  }, [budgetInput]);

  const budgetRemaining = useMemo(() => {
    if (targetBudget === null) return null;
    return targetBudget - totalInCurrency;
  }, [targetBudget, totalInCurrency]);

  const budgetProgress = useMemo(() => {
    if (targetBudget === null || targetBudget <= 0) return 0;
    return Math.min(100, Math.max(0, (totalInCurrency / targetBudget) * 100));
  }, [targetBudget, totalInCurrency]);

  const isOverBudget = useMemo(() => {
    if (targetBudget === null) return false;
    return totalInCurrency > targetBudget;
  }, [targetBudget, totalInCurrency]);

  // Preset chips mirror the configured tier thresholds in the active currency.
  const budgetPresets = useMemo(
    () => tierBudgetPresets(tiers ?? [], currency, exchangeRate),
    [tiers, currency, exchangeRate],
  );

  const sections = useMemo(
    () => buildSponsorSections(packages ?? [], groups),
    [packages, groups],
  );

  const trimmedCompany = company.trim();
  const trimmedEmail = email.trim();
  const trimmedGoals = goals.trim();

  const totalUsdText = totalUsdIsEstimate
    ? `~${formatUsdAmount(totalUsd)} (est.)`
    : formatUsdAmount(totalUsd);
  const totalPrimaryText =
    currency === "USD" ? totalUsdText : formatIDR(total);
  const totalSecondaryText =
    currency === "USD" ? formatIDR(total) : totalUsdText;

  const summaryText = useMemo(() => {
    const lines: string[] = [
      "Hello AWS User Group Jakarta team,",
      "",
      `${trimmedCompany} would like to enquire about sponsoring ${communityDayEvent.name} (${communityDayEvent.date}, ${communityDayEvent.location}).`,
      "",
      "Selected packages (indicative):",
      ...selectedPackages.map((p, i) => {
        const { primary, secondary } = packagePriceParts(p, "IDR", exchangeRate);
        return `${i + 1}. ${p.name} — ${primary} · ${secondary}\n   ${p.advantage}`;
      }),
      "",
      `Estimated total: ${formatIDR(total)} · ${totalUsdText}`,
      `Indicative tier: ${tier?.label ?? "To be confirmed"}`,
      "",
      `Contact email: ${trimmedEmail}`,
    ];
    if (trimmedGoals !== "") {
      lines.push("", `Sponsorship goals: ${trimmedGoals}`);
    }
    lines.push(
      "",
      "Could you confirm the availability of the selected packages, share a final quotation, and outline the next steps?",
      "",
      "Thank you,",
      trimmedCompany,
    );
    return lines.join("\n");
  }, [selectedPackages, total, totalUsdText, tier, trimmedCompany, trimmedEmail, trimmedGoals, exchangeRate]);

  const mailSubject = `Sponsorship Enquiry — ${communityDayEvent.name} — ${trimmedCompany}`;
  const mailHref = `mailto:${sponsorContactEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(summaryText)}`;

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
    if (selectedPackages.length === 0) {
      setFormError("Select at least one available package to prepare your request.");
      return;
    }
    setFormError(null);
    window.location.href = mailHref;
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

  const showConfigurator = status === "ready" && packages !== null && packages.length > 0;

  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              Build Your Package
            </h3>
            <p className="text-muted-foreground text-sm">
              {startFromPackage !== null && (
                <>Start from {formatPackagePrice(startFromPackage, currency, exchangeRate)}. </>
              )}
              Every partner earns a badge.
            </p>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl p-1.5 shrink-0 self-start sm:self-auto">
            <span className="text-xs text-muted-foreground pl-2 font-medium flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              Currency:
            </span>
            <div className="flex rounded-lg bg-muted/60 p-0.5">
              <button
                type="button"
                onClick={() => setCurrency("IDR")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  currency === "IDR"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                IDR (Rp)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  currency === "USD"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                USD ($)
              </button>
            </div>
          </div>
        </header>

        {/* Sponsor Budget Calculator Banner */}
        {showConfigurator && (
          <div className="mb-8 rounded-xl border border-border bg-card/60 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Sponsor Budget Tracker
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Specify your target budget to track remaining funds and optimize package selection.
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                {budgetPresets.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground mr-1">Presets:</span>
                    {budgetPresets.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgetInput(String(preset))}
                        className={cn(
                          "h-7 text-xs px-2.5 cursor-pointer",
                          budgetInput === String(preset) && "border-primary bg-primary/10 text-primary font-bold"
                        )}
                      >
                        {currency === "USD"
                          ? `$${new Intl.NumberFormat("en-US").format(preset)}`
                          : `IDR ${new Intl.NumberFormat("en-US", { notation: "compact" }).format(preset)}`}
                      </Button>
                    ))}
                  </>
                )}
                {budgetInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetInput("")}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  {currency === "USD" ? "$" : "IDR"}
                </span>
                <Input
                  type="number"
                  placeholder={currency === "USD" ? "Target Budget (USD)" : "Target Budget (IDR)"}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="pl-11 h-9 text-xs bg-background"
                />
              </div>

              {targetBudget !== null && (
                <div className="flex-1 flex flex-col justify-center space-y-1.5 bg-background border border-border/60 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground">
                      Target Budget: <strong className="text-foreground">{currency === "USD" ? formatUsdAmount(targetBudget) : formatIDR(targetBudget)}</strong>
                    </span>
                    <span>
                      {isOverBudget ? (
                        <span className="text-destructive font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 inline shrink-0" />
                          Exceeds budget by {currency === "USD" ? formatUsdAmount(totalInCurrency - targetBudget) : formatIDR(totalInCurrency - targetBudget)}
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-medium">
                          Remaining: {currency === "USD" ? formatUsdAmount(budgetRemaining ?? 0) : formatIDR(budgetRemaining ?? 0)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        isOverBudget ? "bg-destructive" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, budgetProgress)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-3 max-w-2xl" aria-label="Loading sponsorship packages">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-border bg-card/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="max-w-2xl rounded-xl border border-border bg-card/40 p-6 space-y-3">
            <p className="font-medium text-foreground">
              Couldn't load sponsorship packages.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your connection and try again, or email{" "}
              <a
                href={`mailto:${sponsorContactEmail}`}
                className="text-primary underline underline-offset-4 break-all"
              >
                {sponsorContactEmail}
              </a>{" "}
              directly.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetryTick((n) => n + 1)}
              className="cursor-pointer"
            >
              <RefreshCw aria-hidden="true" />
              Try Again
            </Button>
          </div>
        )}

        {status === "ready" && (packages === null || packages.length === 0) && (
          <div className="max-w-2xl rounded-xl border border-border bg-card/40 p-6 space-y-2">
            <p className="font-medium text-foreground">
              Sponsorship packages are being finalized.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact{" "}
              <a
                href={`mailto:${sponsorContactEmail}`}
                className="text-primary underline underline-offset-4 break-all"
              >
                {sponsorContactEmail}
              </a>{" "}
              for details.
            </p>
          </div>
        )}

        {showConfigurator && packages && (
          <>
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              <div className="space-y-10">
                {sections.map((section) => {
                  return (
                    <div key={section.id} className="space-y-4">
                      <h4 className="text-lg font-bold text-foreground flex items-center gap-2 border-l-2 border-primary pl-3">
                        {section.label}
                      </h4>
                      <ul className="space-y-3">
                        {section.packages.map((p) => {
                          const Icon = ASSET_ICONS[p.id] || Award;
                          const minimumSpend = minimumSpendOf(p);
                          const maxSponsors = maxSponsorsOf(p);
                          const adminLocked = !p.isUnlocked;
                          const soldOut = !adminLocked && isSoldOut(p);
                          const spendLocked =
                            !adminLocked && !soldOut && minimumSpend !== null && total < minimumSpend;
                          const locked = adminLocked || soldOut || spendLocked;
                          const isChecked = locked ? false : !!effectiveSelection[p.id];
                          const remaining = remainingSponsorSlots(p);
                          const exceedsRemainingBudget =
                            targetBudget !== null &&
                            !isChecked &&
                            budgetRemaining !== null &&
                            (currency === "USD"
                              ? packageUsdPrice(p, exchangeRate)
                              : p.priceIdr) > budgetRemaining;

                          return (
                            <li key={p.id}>
                              <Label
                                htmlFor={p.id}
                                className={cn(
                                  "flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 select-none",
                                  locked
                                    ? "cursor-not-allowed border-border bg-card/40 opacity-60"
                                    : "cursor-pointer hover:bg-accent/40",
                                  isChecked && "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                )}
                              >
                                <div className="flex items-center h-5">
                                  <Checkbox
                                    id={p.id}
                                    checked={isChecked}
                                    disabled={locked}
                                    onCheckedChange={(value) =>
                                      setSelection((prev) => ({ ...prev, [p.id]: value === true }))
                                    }
                                    className={locked ? "cursor-not-allowed" : "cursor-pointer"}
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
                                        <span className="flex flex-wrap items-center gap-2">
                                          <span className="block font-medium text-foreground leading-snug">
                                            {p.name}
                                          </span>
                                          {adminLocked && (
                                            <Badge variant="secondary" className="text-xs">
                                              Not available
                                            </Badge>
                                          )}
                                          {soldOut && (
                                            <Badge variant="secondary" className="text-xs">
                                              Sold out
                                            </Badge>
                                          )}
                                          {!adminLocked && !soldOut && minimumSpend !== null && (
                                            <Badge
                                              variant={spendLocked ? "secondary" : "outline"}
                                              className="text-xs"
                                            >
                                              {spendLocked
                                                ? `Spend ${currency === "USD" ? `~${formatUsdAmount(minimumSpend / exchangeRate)} (est.)` : formatIDR(minimumSpend)} to unlock`
                                                : `Unlock at ${currency === "USD" ? `~${formatUsdAmount(minimumSpend / exchangeRate)} (est.)` : formatIDR(minimumSpend)} spend`}
                                            </Badge>
                                          )}
                                          {!adminLocked && !soldOut && remaining !== null && (
                                            <Badge variant="outline" className="text-xs">
                                              {`${remaining} of ${maxSponsors} slots left`}
                                            </Badge>
                                          )}
                                          {exceedsRemainingBudget && (
                                            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                                              Exceeds target budget
                                            </Badge>
                                          )}
                                        </span>
                                        <span className="block text-xs text-muted-foreground leading-relaxed">
                                          {p.advantage}
                                        </span>
                                      </div>
                                      {/* Price stacked below description on mobile only */}
                                      <span className={cn(
                                        "sm:hidden block text-sm font-semibold",
                                        isChecked ? "text-primary" : "text-muted-foreground"
                                      )}>
                                        {formatPackagePrice(p, currency, exchangeRate)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Price aligned to right on desktop */}
                                  <div className="hidden sm:flex flex-col items-end whitespace-nowrap self-center shrink-0">
                                    <span className={cn(
                                      "text-sm font-semibold",
                                      isChecked ? "text-primary" : "text-muted-foreground"
                                    )}>
                                      {packagePriceParts(p, currency, exchangeRate).primary}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {packagePriceParts(p, currency, exchangeRate).secondary}
                                    </span>
                                  </div>
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
                      {tier && (
                        <Badge
                          variant="outline"
                          className={cn("bg-transparent", TIER_BADGE_CLASS[tier.accent])}
                        >
                          {tier.label}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {total === 0
                          ? "Select a package"
                          : `${selectedPackages.length} ${selectedPackages.length === 1 ? "package" : "packages"} selected`}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
                        {totalPrimaryText}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {totalSecondaryText}
                      </p>
                      {tier && (
                        <p className="text-xs text-muted-foreground">Indicative {tier.label} tier</p>
                      )}
                    </div>
                    {nextTier && total > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            {currency === "USD"
                              ? nextTier.thresholdUsd != null
                                ? formatUsdAmount(
                                    tierThresholdUsd(nextTier, exchangeRate) - totalUsd,
                                  )
                                : `~${formatUsdAmount(
                                    tierThresholdUsd(nextTier, exchangeRate) - totalUsd,
                                  )} (est.)`
                              : formatIDR(nextTier.thresholdIdr - total)}{" "}
                            away from {nextTier.label}
                          </span>
                          <span className="tabular-nums">{Math.round(tierProgress)}%</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`Progress toward ${nextTier.label} tier`}
                          aria-valuenow={Math.round(tierProgress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-2 w-full overflow-hidden rounded-full bg-muted"
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${tierProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
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

                      <Button type="submit" className="w-full cursor-pointer">
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
                          className="w-full cursor-pointer"
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
                            href={mailHref}
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

            {/* Sticky Bottom Bar for Mobile */}
            {total > 0 && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-t border-border p-4 shadow-lg animate-in slide-in-from-bottom duration-300">
                <div className="container mx-auto flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Package Request</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {totalPrimaryText}
                      </span>
                      {tier && (
                        <Badge className={cn("text-[9px] px-1.5 py-0 font-bold", TIER_BADGE_CLASS[tier.accent])}>
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
          </>
        )}
      </div>
    </section>
  );
}
