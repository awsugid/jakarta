import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchSponsorPackages } from "@/lib/api";
import type {
  SponsorPackage,
  SponsorPackageGroup,
  SponsorTier,
} from "@/lib/types";

import {
  COMMUNITY_DAY_EVENT_SLUG,
  DEFAULT_USD_EXCHANGE_RATE,
  EMAIL_PATTERN,
  STORAGE_KEY,
  buildSponsorSections,
  communityDayEvent,
  formatIDR,
  formatPackagePrice,
  formatUsdAmount,
  hasRateDerivedUsd,
  isSoldOut,
  maxSponsorsOf,
  minimumSpendOf,
  nextSponsorTier,
  packagePriceParts,
  packageUsdPrice,
  parseStoredSelection,
  remainingSponsorSlots,
  resolveEffectiveSelection,
  resolveSponsorTier,
  sanitizeSelection,
  sponsorContactEmail,
  sumUsd,
  tierBudgetPresets,
  tierThreshold,
  type LoadStatus,
} from "@/components/sponsor/communityDayConfig";

import { SponsorBudgetTracker } from "./SponsorBudgetTracker";
import { SponsorPackageCard } from "./SponsorPackageCard";
import { SponsorSummaryCard } from "./SponsorSummaryCard";
import { SponsorPlacementModal } from "./SponsorPlacementModal";
import { SponsorMobileBar } from "./SponsorMobileBar";

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
  const [detailPackage, setDetailPackage] = useState<SponsorPackage | null>(null);

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
    [packages, selection]
  );

  const selectedPackages = useMemo(
    () => (packages ?? []).filter((p) => effectiveSelection[p.id]),
    [packages, effectiveSelection]
  );
  const total = useMemo(
    () => selectedPackages.reduce((sum, p) => sum + p.priceIdr, 0),
    [selectedPackages]
  );
  const totalUsd = useMemo(
    () => sumUsd(selectedPackages, exchangeRate),
    [selectedPackages, exchangeRate]
  );
  const totalUsdIsEstimate = hasRateDerivedUsd(selectedPackages);

  const totalInCurrency = currency === "USD" ? totalUsd : total;
  const tier = useMemo(
    () => resolveSponsorTier(totalInCurrency, tiers ?? [], currency, exchangeRate),
    [totalInCurrency, tiers, currency, exchangeRate]
  );
  const nextTier = useMemo(
    () => nextSponsorTier(totalInCurrency, tiers ?? [], currency, exchangeRate),
    [totalInCurrency, tiers, currency, exchangeRate]
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
      (p) => p.isUnlocked && !isSoldOut(p) && minimumSpendOf(p) === null
    );
    if (eligible.length === 0) return null;
    const key = (p: (typeof eligible)[number]) =>
      currency === "USD" ? packageUsdPrice(p, exchangeRate) : p.priceIdr;
    return eligible.reduce((a, b) => (key(b) < key(a) ? b : a));
  }, [packages, currency, exchangeRate]);

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

  const budgetPresets = useMemo(
    () => tierBudgetPresets(tiers ?? [], currency, exchangeRate),
    [tiers, currency, exchangeRate]
  );

  const sections = useMemo(
    () => buildSponsorSections(packages ?? [], groups),
    [packages, groups]
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
      trimmedCompany
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
    <section className={cn("py-16 sm:py-20", total > 0 && "pb-28 lg:pb-20")}>
      <div className="container mx-auto px-4 md:px-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              Build Your Package
            </h3>
            {startFromPackage !== null && (
              <p className="text-muted-foreground text-sm">
                Start from {formatPackagePrice(startFromPackage, currency, exchangeRate)}.
              </p>
            )}
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
                    ? "bg-background text-foreground shadow-sm"
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
          <SponsorBudgetTracker
            budgetPresets={budgetPresets}
            currency={currency}
            budgetInput={budgetInput}
            setBudgetInput={setBudgetInput}
            targetBudget={targetBudget}
            isOverBudget={isOverBudget}
            totalInCurrency={totalInCurrency}
            budgetRemaining={budgetRemaining}
            budgetProgress={budgetProgress}
          />
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
              {/* Main Package Grid */}
              <div className="space-y-10">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h4 className="text-lg font-bold text-foreground flex items-center gap-2 border-l-2 border-primary pl-3">
                      {section.label}
                    </h4>
                    <ul className="space-y-3">
                      {section.packages.map((p) => {
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
                          <SponsorPackageCard
                            key={p.id}
                            packageItem={p}
                            currency={currency}
                            exchangeRate={exchangeRate}
                            isChecked={isChecked}
                            locked={locked}
                            adminLocked={adminLocked}
                            soldOut={soldOut}
                            spendLocked={spendLocked}
                            minimumSpend={minimumSpend}
                            maxSponsors={maxSponsors}
                            remaining={remaining}
                            exceedsRemainingBudget={exceedsRemainingBudget}
                            onToggleSelection={(id, checked) =>
                              setSelection((prev) => ({ ...prev, [id]: checked }))
                            }
                            onViewDetail={(pkg) => setDetailPackage(pkg)}
                          />
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Sidebar Sponsorship Request Card */}
              <aside className="lg:sticky lg:top-24 space-y-4">
                <SponsorSummaryCard
                  total={total}
                  totalUsd={totalUsd}
                  selectedPackages={selectedPackages}
                  tier={tier}
                  nextTier={nextTier}
                  tierProgress={tierProgress}
                  currency={currency}
                  exchangeRate={exchangeRate}
                  totalPrimaryText={totalPrimaryText}
                  totalSecondaryText={totalSecondaryText}
                  company={company}
                  setCompany={setCompany}
                  email={email}
                  setEmail={setEmail}
                  goals={goals}
                  setGoals={setGoals}
                  formError={formError}
                  submitState={submitState}
                  handleSubmit={handleSubmit}
                  handleCopy={handleCopy}
                  copied={copied}
                  clipboardError={clipboardError}
                  summaryText={summaryText}
                  mailHref={mailHref}
                />
              </aside>
            </div>

            {/* Sticky Mobile Summary Bar */}
            {total > 0 && (
              <SponsorMobileBar
                totalPrimaryText={totalPrimaryText}
                tier={tier}
              />
            )}

            {/* Sponsor Placement Detail Modal */}
            <SponsorPlacementModal
              detailPackage={detailPackage}
              onClose={() => setDetailPackage(null)}
              currency={currency}
              exchangeRate={exchangeRate}
              effectiveSelection={effectiveSelection}
              onToggleSelection={(id, checked) =>
                setSelection((prev) => ({ ...prev, [id]: checked }))
              }
              total={total}
            />
          </>
        )}
      </div>
    </section>
  );
}
