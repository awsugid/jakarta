"use client";

import { useState, useEffect } from "react";
import {
  Compass,
  Mic,
  Ticket,
  Calendar,
  Handshake,
  Heart,
  Users,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const SECTION_ITEMS: SectionItem[] = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "cfp", label: "Speakers (CFP)", icon: Mic },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "sponsors", label: "Sponsors", icon: Handshake },
  { id: "volunteers", label: "Volunteers", icon: Heart },
  { id: "team", label: "Team", icon: Users },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function ComDaySectionNav() {
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

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
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
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
    <div className="sticky top-16 sm:top-20 z-40 w-full bg-background/90 backdrop-blur-md border-y border-border/60 shadow-xs select-none">
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
