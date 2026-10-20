"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchPublicSpeakers(eventSlug);
        if (!cancelled) {
          setSpeakers(data.speakers || []);
        }
      } catch {
        if (!cancelled) {
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

  const maxIndex = Math.max(0, speakers.length - 1);

  // Auto-advance interval (6 seconds for single spotlight)
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex]);

  // Clamp index if list changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  if (loading || speakers.length === 0) {
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
        "scroll-mt-20 py-20 bg-background relative border-b border-border overflow-hidden",
        className
      )}
    >
      {/* Background glow effects */}
      <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div
        className={cn(
          "container max-w-6xl mx-auto px-4 md:px-6 relative z-10",
          containerClassName
        )}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              {displayBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {title}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
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
          <div className="overflow-hidden -mx-2 sm:-mx-4 py-2">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {speakers.map((speaker, idx) => {
                const hasLandscapeImage = Boolean(
                  speaker.topicImageUrl && speaker.topicImageUrl.trim().length > 0
                );
                const landscapeImage = hasLandscapeImage ? speaker.topicImageUrl! : null;
                const profilePhoto = speaker.photoUrl;

                return (
                  <div
                    key={speaker.id}
                    className="shrink-0 w-full px-2 sm:px-4"
                  >
                    <Card className="border-border/80 bg-card/75 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl hover:border-orange-500/40 transition-all duration-300">
                      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
                        {/* Media Column (Landscape stage image or ambient profile spotlight fallback) */}
                        <div className="lg:col-span-6 relative overflow-hidden bg-muted flex items-center justify-center min-h-[280px] sm:min-h-[340px] lg:min-h-[440px]">
                          {hasLandscapeImage ? (
                            /* 1. Primary: Speaker while speaking on stage / 16:9 Landscape Banner */
                            <div className="relative w-full h-full min-h-[280px] sm:min-h-[340px] lg:min-h-[440px] overflow-hidden group">
                              <img
                                src={landscapeImage!}
                                alt={speaker.talkTitle}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                              {/* Format Badge Overlay */}
                              <div className="absolute top-4 left-4 z-10">
                                <Badge
                                  className={cn(
                                    "font-semibold text-xs shadow-lg backdrop-blur-md border",
                                    getTalkFormatBadgeClass(speaker.talkFormat)
                                  )}
                                >
                                  {speaker.talkFormat || "Technical Session"}
                                </Badge>
                              </div>

                              {/* Stage Session Indicator */}
                              <div className="absolute top-4 right-4 z-10">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-medium text-white/90 border border-white/10 shadow-lg">
                                  <BookOpen className="h-3.5 w-3.5 text-orange-400" />
                                  Stage Session
                                </span>
                              </div>

                              {/* Bottom Overlay Snippet */}
                              <div className="absolute bottom-4 left-4 z-10">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-medium text-white/90 border border-white/10">
                                  <Mic className="h-3 w-3 text-orange-400" />
                                  Presenter on Stage
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* 2. Fallback: Use Profile Photo with Ambient Blurred Backdrop & Stage Spotlight */
                            <div className="relative w-full h-full min-h-[280px] sm:min-h-[340px] lg:min-h-[440px] overflow-hidden bg-gradient-to-br from-card via-background to-muted/60 flex items-center justify-center p-6 sm:p-8">
                              {/* Ambient blurred backdrop of profile photo */}
                              <img
                                src={profilePhoto}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-3xl scale-150 opacity-25 pointer-events-none"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                              {/* Format Badge Overlay */}
                              <div className="absolute top-4 left-4 z-10">
                                <Badge
                                  className={cn(
                                    "font-semibold text-xs shadow-lg backdrop-blur-md border",
                                    getTalkFormatBadgeClass(speaker.talkFormat)
                                  )}
                                >
                                  {speaker.talkFormat || "Technical Session"}
                                </Badge>
                              </div>

                              {/* Stage Session Indicator */}
                              <div className="absolute top-4 right-4 z-10">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-medium text-white/90 border border-white/10 shadow-lg">
                                  <BookOpen className="h-3.5 w-3.5 text-orange-400" />
                                  Featured Speaker
                                </span>
                              </div>

                              {/* Spotlight Avatar */}
                              <div className="relative z-10 flex flex-col items-center text-center space-y-3.5 max-w-xs">
                                <div className="relative group">
                                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-orange-500 to-pink-500 opacity-60 blur-lg group-hover:opacity-100 transition duration-500" />
                                  <Avatar className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 border-background shadow-2xl">
                                    <AvatarImage
                                      src={profilePhoto}
                                      alt={speaker.name}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="rounded-3xl bg-primary/20 text-primary font-extrabold text-3xl">
                                      {speaker.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl border-2 border-background">
                                    <Mic className="h-4 w-4" />
                                  </span>
                                </div>
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-orange-400 border border-orange-500/30 shadow">
                                    <Sparkles className="h-3 w-3" />
                                    Presenter Spotlight
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Overlay Snippet */}
                              <div className="absolute bottom-4 left-4 z-10">
                                <span className="text-[11px] text-white/70 font-medium">
                                  AWS Community Lineup
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Narrative & Details Column */}
                        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Mic className="h-3.5 w-3.5" />
                                {speaker.talkFormat || "Technical Session"}
                              </span>
                            </div>

                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                              {speaker.talkTitle}
                            </h3>

                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                              {speaker.bio ||
                                "Join this featured session at AWS User Group Jakarta to learn deep architecture insights, production lessons learned, and real-world implementations directly from experienced practitioners."}
                            </p>
                          </div>

                          <div className="pt-6 border-t border-border/70">
                            {/* Speaker Profile Row */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <Avatar className="h-12 w-12 rounded-2xl border-2 border-primary/30 shadow shrink-0">
                                  <AvatarImage
                                    src={speaker.photoUrl}
                                    alt={speaker.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-2xl bg-primary/20 text-primary font-bold">
                                    {speaker.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <h4 className="text-lg font-bold text-foreground truncate">
                                    {speaker.name}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
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
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shrink-0 shadow-sm"
                                >
                                  <span>Speaker Profile</span>
                                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
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

        {/* Carousel Controls & Slide Status Below Speaker Card */}
        {speakers.length > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2">
            {/* Slide Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Speaker</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                {currentIndex + 1} of {speakers.length}
              </span>
            </div>

            {/* Slide Indicator Dots */}
            <div className="flex items-center gap-2">
              {speakers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to speaker ${i + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 cursor-pointer",
                    currentIndex === i
                      ? "w-8 bg-orange-500 shadow-sm shadow-orange-500/40"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>

            {/* Prev and Next Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                aria-label="Previous speaker"
                className="h-9 px-3.5 rounded-full border-border bg-card hover:bg-accent cursor-pointer text-xs font-medium"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNext}
                aria-label="Next speaker"
                className="h-9 px-3.5 rounded-full border-border bg-card hover:bg-accent cursor-pointer text-xs font-medium"
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
