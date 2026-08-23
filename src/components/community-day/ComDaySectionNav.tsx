"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Compass,
  Mic,
  Ticket,
  Calendar,
  Handshake,
  Heart,
  Users,
  HelpCircle,
  X,
  Sparkles,
  Presentation,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const SECTION_ITEMS: SectionItem[] = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "cfp", label: "Speakers (CFP)", icon: Mic, badge: "Open" },
  { id: "tickets", label: "Get Tickets", icon: Ticket, badge: "Registration" },
  { id: "agenda", label: "Schedule", icon: Calendar },
  { id: "sponsors", label: "Sponsors", icon: Handshake },
  { id: "volunteers", label: "Volunteers", icon: Heart },
  { id: "team", label: "Team & Organizers", icon: Users },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

const SPONSOR_MOBILE_SECTION_ITEMS: SectionItem[] = [
  { id: "comday", label: "Community Day 2026", icon: Presentation, badge: "Oct 31" },
  { id: "monthly", label: "Monthly Meetup", icon: Handshake, badge: "Open" },
  { id: "contact", label: "Get in Touch", icon: HelpCircle },
];

export function ComDaySectionNav() {
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    const mainNav = document.getElementById("main-desktop-nav");

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      // Scroll Spy: Find active section
      for (let i = SECTION_ITEMS.length - 1; i >= 0; i--) {
        const item = SECTION_ITEMS[i];
        const element = document.getElementById(item.id);
        if (element) {
          const top = element.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(item.id);
            break;
          }
        }
      }

      // Hide main desktop navigation links when section navigation is active (scrolled past hero)
      if (mainNav) {
        if (window.scrollY > 240) {
          mainNav.classList.add("lg:opacity-0", "lg:pointer-events-none", "-translate-y-2");
          mainNav.classList.remove("lg:opacity-100", "lg:pointer-events-auto", "translate-y-0");
        } else {
          mainNav.classList.remove("lg:opacity-0", "lg:pointer-events-none", "-translate-y-2");
          mainNav.classList.add("lg:opacity-100", "lg:pointer-events-auto", "translate-y-0");
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mainNav) {
        mainNav.classList.remove("lg:opacity-0", "lg:pointer-events-none", "-translate-y-2");
        mainNav.classList.add("lg:opacity-100", "lg:pointer-events-auto", "translate-y-0");
      }
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (!element) return;

    const navOffset = 130;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - navOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <div className="hidden lg:block sticky top-20 z-40 w-full bg-background/90 backdrop-blur-md border-y border-border/60 shadow-xs select-none">
      <div className="container max-w-7xl mx-auto px-4">
        <nav
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
          aria-label="Section Navigation"
        >
          {SECTION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 border cursor-pointer",
                  isActive
                    ? "bg-orange-500/15 text-orange-400 border-orange-500/40 shadow-xs font-bold"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/70 hover:border-border/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0", isActive ? "text-orange-400" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * Mobile Section Hamburger Button & Drawer
 * Renders on /comday and /sponsor pages.
 */
export function ComDayMobileSectionNav() {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [open]);

  const isSponsorPage = currentPath.startsWith("/sponsor");
  const items = isSponsorPage ? SPONSOR_MOBILE_SECTION_ITEMS : SECTION_ITEMS;
  const titleText = isSponsorPage ? "Sponsorship Sections" : "ComDay Sections";

  const scrollToSection = (id: string) => {
    setActiveId(id);
    setOpen(false);

    if (isSponsorPage) {
      if (id === "comday") {
        window.dispatchEvent(new CustomEvent("sponsor-tab-change", { detail: "community" }));
      } else if (id === "monthly") {
        window.dispatchEvent(new CustomEvent("sponsor-tab-change", { detail: "monthly" }));
      }
    }

    setTimeout(() => {
      const element = document.getElementById(id);
      if (!element) return;

      const navOffset = 90;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }, 50);
  };

  return (
    <div className="lg:hidden">
      {/* Mobile Hamburger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open section menu"
        className="h-9 px-3 gap-1.5 rounded-xl bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 font-bold text-xs shadow-xs cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
        <span>Sections</span>
      </Button>

      {open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in"
              onClick={() => setOpen(false)}
            />

            {/* Slide-out Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-[111] w-[320px] sm:w-[360px] bg-background/95 backdrop-blur-xl border-l border-border/80 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">
              <div className="overflow-y-auto max-h-[85vh] pr-1 space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2 text-orange-400 font-extrabold text-sm tracking-tight">
                    <Sparkles className="h-4 w-4" />
                    <span>{titleText}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Section Quick Jump List */}
                <nav className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1 mb-1">
                    Jump to Section
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToSection(item.id)}
                        className={cn(
                          "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm font-bold tracking-tight transition-all flex items-center justify-between active:scale-[0.98] cursor-pointer text-left",
                          isActive
                            ? "border-orange-500/40 bg-orange-500/15 text-orange-400 shadow-xs"
                            : "border-border/40 bg-card/40 text-foreground/80 hover:text-foreground hover:bg-card hover:border-border/80"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-1.5 rounded-lg",
                              isActive
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-border/40 shrink-0">
                <p className="text-xs font-bold text-foreground">
                  {isSponsorPage ? "Sponsorship & Collaboration" : "AWS Community Day Jakarta 2026"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  AWS User Group Jakarta
                </p>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
