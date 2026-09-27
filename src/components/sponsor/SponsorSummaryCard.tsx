import type { FormEvent } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SponsorPackage, SponsorTier } from "@/lib/types";
import {
  TIER_BADGE_CLASS,
  formatIDR,
  formatUsdAmount,
  sponsorContactEmail,
  tierThresholdUsd,
} from "@/components/sponsor/communityDayConfig";

interface SponsorSummaryCardProps {
  total: number;
  selectedPackages: SponsorPackage[];
  tier: SponsorTier | null;
  nextTier: SponsorTier | null;
  tierProgress: number;
  currency: "IDR" | "USD";
  exchangeRate: number;
  totalPrimaryText: string;
  totalSecondaryText: string;
  company: string;
  setCompany: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  goals: string;
  setGoals: (val: string) => void;
  formError: string | null;
  submitState: "idle" | "prepared";
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  handleCopy: () => void;
  copied: boolean;
  clipboardError: string | null;
  summaryText: string;
  mailHref: string;
  totalUsd: number;
}

export function SponsorSummaryCard({
  total,
  selectedPackages,
  tier,
  nextTier,
  tierProgress,
  currency,
  exchangeRate,
  totalPrimaryText,
  totalSecondaryText,
  company,
  setCompany,
  email,
  setEmail,
  goals,
  setGoals,
  formError,
  submitState,
  handleSubmit,
  handleCopy,
  copied,
  clipboardError,
  summaryText,
  mailHref,
  totalUsd,
}: SponsorSummaryCardProps) {
  return (
    <Card
      id="sponsorship-form-card"
      className={cn(
        "transition-all duration-300",
        total > 0 && "border-primary/30 shadow-lg shadow-primary/5"
      )}
    >
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
              : `${selectedPackages.length} ${
                  selectedPackages.length === 1 ? "package" : "packages"
                } selected`}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {totalPrimaryText}
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            {totalSecondaryText}
          </p>
          {tier && (
            <p className="text-xs text-muted-foreground">
              Indicative {tier.label} tier
            </p>
          )}
        </div>
        {nextTier && total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {currency === "USD"
                  ? nextTier.thresholdUsd != null
                    ? formatUsdAmount(
                        tierThresholdUsd(nextTier, exchangeRate) - totalUsd
                      )
                    : `~${formatUsdAmount(
                        tierThresholdUsd(nextTier, exchangeRate) - totalUsd
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
          Package selections are requests, not reservations. Prices are indicative,
          subject to availability, and finalized by agreement.
        </p>
        <p className="text-xs text-amber-300 leading-relaxed">
          No baseline package comes with automatic booths; booths can be added in
          subsequent phases upon venue capacity confirmation.
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
              <span className="text-xs text-muted-foreground">
                {goals.length}/1000
              </span>
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

          <Button type="submit" className="w-full h-11 cursor-pointer">
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
              Email draft prepared. Send it from your email app to submit your
              package request.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              onClick={handleCopy}
            >
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
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
  );
}
