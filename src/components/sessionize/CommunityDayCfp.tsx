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
import { SESSIONIZE_CONFIG } from "@/lib/sessionize";

interface CommunityDayCfpProps {
  className?: string;
  compact?: boolean;
}

export function CommunityDayCfp({ className = "", compact = false }: CommunityDayCfpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-card/50 to-amber-500/[0.02] backdrop-blur-md shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        <div className="space-y-4 max-w-2xl">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {SESSIONIZE_CONFIG.statusLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-300 border border-orange-500/20">
              <MapPin className="h-3 w-3 text-orange-400" />
              {SESSIONIZE_CONFIG.venue}
            </span>
          </div>

          {/* Title & Deadline Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-widest">
              <Calendar className="h-3.5 w-3.5" />
              <span>Submission Deadline</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {SESSIONIZE_CONFIG.dates.deadlineDisplay}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                at {SESSIONIZE_CONFIG.dates.deadlineTimeDisplay}
              </span>
            </h3>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Propose a <strong>30 or 45-minute</strong> talk for Indonesia&apos;s premier community-led AWS conference. Submissions are hosted via Sessionize.
          </p>

          {/* Track Summary Badges */}
          {!compact && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-orange-400" />
                <span>Tracks:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SESSIONIZE_CONFIG.tracks.map((track, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/60 text-secondary-foreground text-xs font-medium border border-border/50"
                  >
                    <Sparkles className="h-3 w-3 text-orange-400" />
                    {track.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:min-w-[220px]">
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

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-orange-500/30 text-orange-300 hover:bg-orange-500/10 font-medium py-5 rounded-xl text-xs"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" /> View Guidelines
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Mic className="h-5 w-5 text-orange-400" /> CFP Submission Guidelines
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Please review the guidelines before submitting on Sessionize.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-2 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  {SESSIONIZE_CONFIG.guidelines.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
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
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold"
                  onClick={() => {
                    window.open(SESSIONIZE_CONFIG.CFP_URL, "_blank");
                    setIsOpen(false);
                  }}
                >
                  Continue to Sessionize <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
