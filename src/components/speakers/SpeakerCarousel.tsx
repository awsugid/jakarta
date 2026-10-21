"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Mic, ChevronLeft, ChevronRight, ExternalLink, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchPublicSpeakers } from "@/lib/api";
import type { EventSpeaker } from "@/lib/types";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

interface SpeakerCarouselProps {
  eventSlug?: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  containerClassName?: string;
}

function getTalkFormatBadgeClass(format?: string | null) {
  if (!format) return "bg-primary/10 text-primary border-primary/30";
  const lower = format.toLowerCase();
  if (lower.includes("keynote")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  }
  if (lower.includes("workshop") || lower.includes("hands-on")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/40";
  }
  if (lower.includes("lightning")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  }
  if (lower.includes("panel")) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/40";
  }
  return "bg-sky-500/15 text-sky-400 border-sky-500/40";
}

export function SpeakerCarousel({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  badge,
  title = "Featured Speakers & Topics",
  subtitle = "Discover the confirmed keynotes, technical deep dives, and hands-on sessions at AWS Community Day Jakarta 2026.",
  className,
  containerClassName,
}: SpeakerCarouselProps) {
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        // Speakers come from backend D1 only — no Sessionize fallback.
        const data = await fetchPublicSpeakers(eventSlug);
        if (!cancelled) {
          setSpeakers(data.speakers || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load speakers");
          setSpeakers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  const maxIndex = useMemo(() => Math.max(0, speakers.length - 1), [speakers.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  // Auto-advance interval (6 seconds for single spotlight)
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex, handleNext]);

  // Clamp index if list changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  }, [handleNext, handlePrev]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <section id="speakers" className={cn("py-20", className)}>
        <p className="text-center text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (speakers.length === 0) {
    return null;
  }

  const displayBadge =
    badge ??
    (eventSlug === COMMUNITY_DAY_EVENT_SLUG
      ? "Community Day 2026 Lineup"
      : "Featured Speakers");

  return (
    <section
      id="speakers"
      className={cn(
        "scroll-mt-20 py-12 md:py-16 bg-background relative border-b border-border overflow-hidden",
        className
      )}
    >
      {/* Background glow effects */}
      <div className="absolute right-0 top-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div
        className={cn(
          "container max-w-6xl mx-auto px-4 md:px-6 relative z-10",
          containerClassName
        )}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              {displayBadge}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {title}
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Carousel Content: Exactly 1 Card per View */}
        <div
          className="relative select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden -mx-2 sm:-mx-3 py-1">
            <div
              className="flex items-stretch transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {speakers.map((speaker) => {
                const rawTopicImage = speaker.topicImageUrl?.trim();
                const rawPhoto = speaker.photoUrl?.trim();
                const displayImage =
                  rawTopicImage && rawTopicImage.length > 0 ? rawTopicImage : rawPhoto;

                return (
                  <div
                    key={speaker.id}
                    className="shrink-0 w-full px-2 sm:px-3 flex"
                  >
                    <Card className="w-full h-full border-border/80 bg-card/75 backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between">
                      <div className="grid grid-cols-1 lg:grid-cols-12 h-full w-full min-h-[340px] lg:min-h-[380px] flex-1">
                        {/* Media Column (Strictly constrained container with absolute inset-0 auto-crop for both portrait & landscape) */}
                        <div className="lg:col-span-5 xl:col-span-5 relative w-full h-64 sm:h-72 lg:h-full min-h-[260px] sm:min-h-[300px] lg:min-h-0 overflow-hidden bg-muted group min-w-0 min-h-0">
                          {/* Ambient blurred backdrop for rich atmospheric glow */}
                          <img
                            src={displayImage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
                            aria-hidden="true"
                          />

                          {/* Main Full-Bleed Presenter Photo with absolute inset-0 (Zero layout influence, auto-cropped) */}
                          <img
                            src={displayImage}
                            alt={speaker.name}
                            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
                            loading="lazy"
                            decoding="async"
                          />

                          {/* Gradient scrim for readable badges & sleek transition */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none z-1" />

                          {/* Format Badge Overlay (Top Left) */}
                          <div className="absolute top-3.5 left-3.5 z-10">
                            <Badge
                              className={cn(
                                "font-semibold text-xs shadow-md backdrop-blur-md border",
                                getTalkFormatBadgeClass(speaker.talkFormat)
                              )}
                            >
                              {speaker.talkFormat || "Technical Session"}
                            </Badge>
                          </div>

                          {/* Stage Session Indicator (Top Right) */}
                          <div className="absolute top-3.5 right-3.5 z-10">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-medium text-white/90 border border-white/10 shadow-md">
                              <BookOpen className="h-3 w-3 text-orange-400" />
                              Stage Session
                            </span>
                          </div>

                          {/* Bottom Overlay Snippet with Presenter Name */}
                          <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-semibold text-white/95 border border-white/15 shadow-lg">
                              <Mic className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                              <span className="truncate">{speaker.name}</span>
                            </span>
                            <span className="text-[11px] text-white/70 font-medium hidden sm:inline">
                              AWS Community Day
                            </span>
                          </div>
                        </div>

                        {/* Narrative & Details Column (Normalized heights prevent section jumping on slide changes) */}
                        <div className="lg:col-span-7 xl:col-span-7 p-5 sm:p-7 lg:p-8 flex flex-col justify-between space-y-4 sm:space-y-6 min-w-0">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Mic className="h-3.5 w-3.5" />
                                {speaker.talkFormat || "Technical Session"}
                              </span>
                            </div>

                            <h3 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-tight line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem]">
                              {speaker.talkTitle}
                            </h3>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-4 min-h-[4.5rem] sm:min-h-[5.25rem] lg:min-h-[5.5rem]">
                              {speaker.bio ||
                                "Join this featured session at AWS User Group Jakarta to learn deep architecture insights, production lessons learned, and real-world implementations directly from experienced practitioners."}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-border/70 mt-auto">
                            {/* Speaker Profile Row */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border-2 border-primary/30 shadow shrink-0">
                                  <AvatarImage
                                    src={speaker.photoUrl}
                                    alt={speaker.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-xl sm:rounded-2xl bg-primary/20 text-primary font-bold text-xs sm:text-sm">
                                    {speaker.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <h4 className="text-sm sm:text-base font-bold text-foreground truncate">
                                    {speaker.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {speaker.role}{" "}
                                    {speaker.company ? `· ${speaker.company}` : ""}
                                  </p>
                                </div>
                              </div>

                              {speaker.socialUrl && (
                                <a
                                  href={speaker.socialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
                                >
                                  <span>Profile</span>
                                  <ExternalLink className="h-3 w-3 text-primary" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Carousel Controls & Sleek Compact Status */}
        {speakers.length > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-5 sm:mt-6 px-1">
            {/* Slide Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Speaker</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                {currentIndex + 1} of {speakers.length}
              </span>
            </div>

            {/* Sleek Progress Indicator (Never wraps or adds vertical space) */}
            <div className="flex items-center gap-2 flex-1 max-w-[180px] sm:max-w-xs mx-auto w-full">
              <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / speakers.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Prev and Next Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                aria-label="Previous speaker"
                className="h-8 sm:h-9 px-3 rounded-full border-border bg-card hover:bg-accent cursor-pointer text-xs font-medium"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNext}
                aria-label="Next speaker"
                className="h-8 sm:h-9 px-3 rounded-full border-border bg-card hover:bg-accent cursor-pointer text-xs font-medium"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

(SpeakerCarousel as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";
