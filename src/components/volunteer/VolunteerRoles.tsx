import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Users, XCircle, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormInfo } from "@/lib/types";
import { isTalentPoolForm } from "@/components/volunteer/talentPool";
import { divisions, nameToSlug } from "@/data/volunteer-divisions";

export { divisions, nameToSlug };

interface VolunteerRolesProps {
  forms?: FormInfo[];
  loading?: boolean;
  onApply?: (slug: string, title: string) => void;
}

export function VolunteerRoles({ forms, loading = false, onApply }: VolunteerRolesProps) {
  const [cardsPerView, setCardsPerView] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

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

  // Build a lookup from slug to FormInfo
  const formBySlug = new Map<string, FormInfo>();
  if (forms) {
    for (const f of forms) {
      formBySlug.set(f.slug, f);
    }
  }

  const maxIndex = Math.max(0, divisions.length - cardsPerView);

  // Auto-advance interval
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

  return (
    <section id="volunteer-roles" className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              🙌 Community Teams
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Volunteer Divisions & Roles
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Explore the teams that keep AWS User Group Jakarta running. Each division plays a vital role in delivering great experiences.
            </p>
          </div>

          {/* Carousel Navigation Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePrev}
              aria-label="Previous division"
              className="h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-accent cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleNext}
              aria-label="Next division"
              className="h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-accent cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden -mx-3 py-2">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
              }}
            >
              {divisions.map((division) => {
                const slug = nameToSlug[division.name];
                const form = slug ? formBySlug.get(slug) : undefined;
                const isOpen = !!form?.is_active;
                const isPool = form ? isTalentPoolForm("volunteer", form) : false;

                return (
                  <div
                    key={division.name}
                    className="shrink-0 px-3 w-full sm:w-1/2 lg:w-1/3"
                  >
                    <Card className="h-full flex flex-col justify-between group relative overflow-hidden border-border/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 bg-card/90 backdrop-blur-sm">
                      <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <division.icon className="h-6 w-6" />
                          </div>
                          {/* Status badge */}
                          <div>
                            {loading && !form ? (
                              <div className="h-5 w-16 bg-muted/60 animate-pulse rounded-full" />
                            ) : isOpen ? (
                              <Badge className="text-xs bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/10 font-semibold">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            ) : isPool ? (
                              <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 font-semibold">
                                <Users className="h-3 w-3 mr-1" />
                                Talent Pool
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground border-muted-foreground/20"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Closed
                              </Badge>
                            )}
                          </div>
                        </div>

                        <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                          {division.name}
                        </CardTitle>

                        <CardDescription className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {division.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                            Key Responsibilities
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {division.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className="text-xs bg-secondary/80"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                            Skills You'll Gain
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {division.skills.map((skill) => (
                              <span
                                key={skill}
                                className="text-xs text-primary/80 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {onApply && (isOpen || isPool) && (
                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (slug && form) {
                                  onApply(slug, form.title);
                                }
                              }}
                              className="w-full justify-between text-xs font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                            >
                              <span>{isOpen ? "Apply for this Division" : "Join Talent Pool"}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicator dots */}
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
        </div>
      </div>
    </section>
  );
}
