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
import type { NavItem } from "@/lib/navigation";
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
  { id: "agenda", label: "Schedule", icon: Calendar },
  { id: "sponsors", label: "Sponsors", icon: Handshake },
  { id: "volunteers", label: "Volunteers", icon: Heart },
  { id: "team", label: "Team", icon: Users },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

interface HeaderDesktopNavProps {
  currentPath: string;
  items: NavItem[];
}

export function HeaderDesktopNav({ currentPath, items }: HeaderDesktopNavProps) {
  const isComDayPage = currentPath === "/comday-26" || currentPath === "/comday-26/";
  const [showSectionNav, setShowSectionNav] = useState(false);
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    if (!isComDayPage) return;

    const handleScroll = () => {
      // Toggle section nav when scrolled past hero (180px)
      const scrolled = window.scrollY > 180;
      setShowSectionNav(scrolled);

      if (scrolled) {
        const scrollPosition = window.scrollY + 120;
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
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isComDayPage]);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (!element) return;

    const navOffset = 85;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - navOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <nav className="hidden lg:flex items-center tracking-tight text-[15px] xl:text-base font-bold min-h-[40px] relative">
      {/* 1. Main Site Navigation Links */}
      <div
        className={cn(
          "flex items-center gap-6 xl:gap-8 transition-all duration-300 ease-in-out",
          showSectionNav && isComDayPage
            ? "opacity-0 pointer-events-none -translate-y-2 scale-95 absolute inset-0"
            : "opacity-100 pointer-events-auto translate-y-0 scale-100 relative"
        )}
      >
        {items.map((item) => {
          const isActive =
            currentPath === item.href ||
            currentPath === `${item.href}/` ||
            (item.href !== "/" && currentPath.startsWith(item.href));
          const isComday = item.href === "/comday-26";

          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "transition-all duration-200 flex items-center gap-1.5 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]",
                isComday
                  ? "text-orange-400 font-extrabold hover:text-orange-300"
                  : isActive
                    ? "text-primary font-extrabold underline underline-offset-8 decoration-primary decoration-2"
                    : "text-foreground hover:text-primary font-bold"
              )}
            >
              <span>{item.name}</span>
              {isComday && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/25 text-orange-400 border border-orange-500/40 shadow-xs">
                  2026
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* 2. ComDay '26 Section Navigation Links (Swaps into main nav spot when active) */}
      {isComDayPage && (
        <div
          className={cn(
            "flex items-center gap-1 xl:gap-1.5 transition-all duration-300 ease-in-out",
            showSectionNav
              ? "opacity-100 pointer-events-auto translate-y-0 scale-100 relative"
              : "opacity-0 pointer-events-none translate-y-2 scale-95 absolute inset-0"
          )}
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
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs xl:text-sm font-semibold transition-all duration-200 shrink-0 border cursor-pointer",
                  isActive
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-xs font-bold"
                    : "text-foreground/80 border-transparent hover:text-foreground hover:bg-muted/60 hover:border-border/40"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-orange-400" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
