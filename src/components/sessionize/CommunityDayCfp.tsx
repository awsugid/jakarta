"use client";

import { useState } from "react";
import {
  Mic,
  Calendar,
  MapPin,
  ArrowUpRight,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SESSIONIZE_CONFIG, isCfpOpen } from "@/lib/sessionize";
import { cn } from "@/lib/utils";

interface CommunityDayCfpProps {
  className?: string;
  compact?: boolean;
}

export function CommunityDayCfp({ className = "", compact = false }: CommunityDayCfpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = isCfpOpen();

  return (
    <div
      className={cn(
        "p-6 sm:p-8 rounded-3xl backdrop-blur-md shadow-xl relative overflow-hidden transition-all duration-300 border",
        active
          ? "border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-card/50 to-amber-500/[0.02]"
          : "border-purple-500/25 bg-gradient-to-br from-purple-500/[0.05] via-card/60 to-indigo-500/[0.03]",
        className
      )}
    >
      {/* Background Decorative Glow */}
      <div
        className={cn(
          "absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none",
          active ? "bg-orange-500/5" : "bg-purple-500/10"
        )}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        <div className="space-y-4 max-w-2xl">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {active ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {SESSIONIZE_CONFIG.statusLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Community Day 2026 Closed • Monthly Meetups Open
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                active
                  ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
                  : "bg-purple-500/10 text-purple-300 border-purple-500/20"
              )}
            >
              <MapPin className={cn("h-3 w-3", active ? "text-orange-400" : "text-purple-400")} />
              {SESSIONIZE_CONFIG.venue}
            </span>
          </div>

          {/* Title & Deadline Header */}
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest",
                active ? "text-orange-400" : "text-purple-400"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{active ? "Submission Deadline" : "Community Day 2026 Submissions Wrapped Up"}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {active ? (
                <>
                  {SESSIONIZE_CONFIG.dates.deadlineDisplay}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    at {SESSIONIZE_CONFIG.dates.deadlineTimeDisplay}
                  </span>
                </>
              ) : (
                <>
                  Speak at Monthly Meetups
                </>
              )}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {active ? (
              <>
                Propose a <strong>30 or 45-minute</strong> talk for Indonesia&apos;s premier community-led AWS conference. Submissions are hosted via Sessionize.
              </>
            ) : (
              <>
                Submissions for Community Day 2026 have ended, but <strong>your speaking journey with AWS User Group Jakarta continues!</strong> We host technical monthly meetups throughout the year and are actively accepting speaker applications.
              </>
            )}
          </p>

          {/* Track Summary Badges */}
          {!compact && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className={cn("h-3.5 w-3.5", active ? "text-orange-400" : "text-purple-400")} />
                <span>Featured Topics & Tracks:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SESSIONIZE_CONFIG.tracks.map((track, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 text-secondary-foreground text-xs font-medium border border-border/50"
                  >
                    <Sparkles className={cn("h-3 w-3", active ? "text-orange-400" : "text-purple-400")} />
                    {track.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:min-w-[240px]">
          {active ? (
            <a
              href={SESSIONIZE_CONFIG.CFP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-slate-950 font-bold py-5 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm justify-center group">
                <Mic className="mr-2 h-4 w-4" /> Submit your Paper Here
                <ArrowUpRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </a>
          ) : (
            <a href="/speakers?tab=monthly#speaker-tab-monthly" className="w-full">
              <Button className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-5 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all text-sm justify-center group">
                <Mic className="mr-2 h-4 w-4" /> Speak at Monthly Meetups
                <ArrowUpRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </a>
          )}

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full font-medium py-5 rounded-xl text-xs",
                  active
                    ? "border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                    : "border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                )}
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" /> {active ? "View Guidelines" : "Speaker Guidelines"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Mic className={cn("h-5 w-5", active ? "text-orange-400" : "text-purple-400")} /> Speaker Guidelines & Opportunities
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  {active
                    ? "Please review the guidelines before submitting on Sessionize."
                    : "Community Day 2026 CFP is closed, but we welcome speakers for our Monthly Meetups and future events!"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-2 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  {SESSIONIZE_CONFIG.guidelines.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", active ? "text-orange-400" : "text-purple-400")} />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
                {active ? (
                  <Button
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold"
                    onClick={() => {
                      window.open(SESSIONIZE_CONFIG.CFP_URL, "_blank");
                      setIsOpen(false);
                    }}
                  >
                    Continue to Sessionize <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <a href="/speakers?tab=monthly#speaker-tab-monthly" className="flex-1">
                    <Button
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold"
                      onClick={() => setIsOpen(false)}
                    >
                      Apply for Monthly Meetups <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
