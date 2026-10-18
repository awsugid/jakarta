"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, ChevronLeft, ChevronRight, ExternalLink, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  const [cardsPerView, setCardsPerView] = useState(3);
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

  // Responsive cards per view
  useEffect(() => {
    const updateCardsPerView = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 640) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  const maxIndex = Math.max(0, speakers.length - cardsPerView);

  // Auto-advance interval (4 seconds)
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex]);

  // Clamp index if view resized
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
      <div className="absolute right-0 top-1/4 w-[450px] h-[450px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div
        className={cn(
          "container max-w-6xl mx-auto px-4 md:px-6 relative z-10",
          containerClassName
        )}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
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

          {/* Carousel Controls */}
          {speakers.length > cardsPerView && (
            <div className="flex items-center gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePrev}
                aria-label="Previous speaker"
                className="h-10 w-10 rounded-full border-border bg-card/80 backdrop-blur-sm shadow-sm hover:bg-accent cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNext}
                aria-label="Next speaker"
                className="h-10 w-10 rounded-full border-border bg-card/80 backdrop-blur-sm shadow-sm hover:bg-accent cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Carousel Content */}
        <div
          className="relative select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden -mx-3 py-3">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
              }}
            >
              {speakers.map((speaker) => {
                const topicImage =
                  speaker.topicImageUrl ||
                  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={speaker.id}
                    className="shrink-0 px-3 w-full sm:w-1/2 lg:w-1/3"
                  >
                    <Card className="h-full flex flex-col justify-between border-border/80 bg-card/70 backdrop-blur-md rounded-3xl overflow-hidden hover:border-orange-500/40 hover:shadow-2xl transition-all duration-300 group">
                      <div>
                        {/* Topic Banner Image (16:9 Aspect Ratio) */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                          <img
                            src={topicImage}
                            alt={speaker.talkTitle}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          {/* Dark gradient overlay for text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                          {/* Talk Format Badge overlaid on top banner */}
                          <div className="absolute top-3 left-3">
                            {speaker.talkFormat && (
                              <Badge className="bg-orange-500/90 text-white border-0 font-semibold text-xs shadow-md backdrop-blur-sm">
                                {speaker.talkFormat}
                              </Badge>
                            )}
                          </div>

                          <div className="absolute top-3 right-3">
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-medium text-white/90 border border-white/10">
                              <BookOpen className="h-3 w-3 text-orange-400" />
                              Session
                            </span>
                          </div>

                          {/* Topic title snippet overlay on bottom of banner */}
                          <div className="absolute bottom-2 left-3 right-3 text-left">
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider line-clamp-1">
                              Topic Highlight
                            </p>
                          </div>
                        </div>

                        {/* Speaker Profile Section */}
                        <CardContent className="p-6 pt-0 space-y-4">
                          {/* Overlapping Profile Photo */}
                          <div className="flex items-end justify-between -mt-9 relative z-10">
                            <div className="relative">
                              <Avatar className="h-18 w-18 rounded-2xl border-4 border-card shadow-xl group-hover:border-primary/50 transition-colors">
                                <AvatarImage
                                  src={speaker.photoUrl}
                                  alt={speaker.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="rounded-2xl bg-primary/20 text-primary font-bold text-lg">
                                  {speaker.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                                <Mic className="h-3 w-3" />
                              </span>
                            </div>

                            {speaker.socialUrl && (
                              <a
                                href={speaker.socialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline underline-offset-4 cursor-pointer pb-1"
                              >
                                <span>Profile</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>

                          {/* Speaker Identity */}
                          <div>
                            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                              {speaker.name}
                            </h3>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">
                              {speaker.role} {speaker.company ? `· ${speaker.company}` : ""}
                            </p>
                          </div>

                          {/* Talk Title */}
                          <div className="pt-2 border-t border-border/50 space-y-2">
                            <h4 className="font-bold text-foreground text-base leading-snug line-clamp-2">
                              {speaker.talkTitle}
                            </h4>
                            {speaker.bio && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                {speaker.bio}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots Indicator */}
          {speakers.length > cardsPerView && (
            <div className="flex justify-center items-center gap-1.5 pt-8">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

(SpeakerCarousel as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";
