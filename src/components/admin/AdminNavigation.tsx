"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminMe } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Inbox,
  Layers,
  Link2,
  LogOut,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";

export type AdminTab =
  | "responses"
  | "forms"
  | "links"
  | "sponsors-directory"
  | "sponsors";

export interface AdminTabItem {
  id: AdminTab;
  label: string;
  shortLabel?: string;
  description: string;
  icon: typeof Inbox;
}

export const ADMIN_TABS: AdminTabItem[] = [
  {
    id: "responses",
    label: "Responses",
    shortLabel: "Responses",
    description: "Inspect, filter, and tag community form submissions",
    icon: Inbox,
  },
  {
    id: "forms",
    label: "Volunteer & CFP Config",
    shortLabel: "Form Config",
    description: "Configure open/closed status and announcement notices",
    icon: SlidersHorizontal,
  },
  {
    id: "links",
    label: "Links",
    shortLabel: "Links",
    description: "Manage short links, redirects, and custom URLs",
    icon: Link2,
  },
  {
    id: "sponsors-directory",
    label: "Sponsor Directory",
    shortLabel: "Sponsors",
    description: "Manage community sponsor logos, links, and display order",
    icon: Building2,
  },
  {
    id: "sponsors",
    label: "Sponsor Packages & Pricing",
    shortLabel: "Packages",
    description: "Configure sponsorship tiers, perks, quotas, and pricing",
    icon: Layers,
  },
];

interface AdminNavigationProps {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
  admin?: AdminMe;
  onRefresh?: () => void;
  loading?: boolean;
  refreshDisabled?: boolean;
}

export function AdminNavigation({
  active,
  onChange,
  admin,
  onRefresh,
  loading = false,
  refreshDisabled = false,
}: AdminNavigationProps) {
  const { signOut } = useAuth();

  const adminName = admin?.name || admin?.email || "Admin";
  const initials = (admin?.name || admin?.email || "AD")
    .split("@")[0]
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      {/* Top utility row */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/"
              className="flex items-center gap-2.5 transition-transform hover:opacity-90 active:scale-95"
              aria-label="AWS User Group Jakarta - Back to website"
              title="AWS User Group Jakarta"
            >
              <img
                src="/android-chrome-192x192.png"
                alt="AWS User Group Jakarta"
                className="h-8 w-8 rounded-lg shadow-sm"
              />
              <span className="font-bold text-base tracking-tight hidden sm:inline-block">
                AWS UG Jakarta
              </span>
            </a>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 shadow-sm">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav
            role="tablist"
            aria-label="Admin console navigation"
            className="hidden lg:flex items-center gap-1.5"
          >
            {ADMIN_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => onChange(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Utilities & User Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {active === "responses" && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshDisabled}
                className="h-8 px-2.5 text-xs gap-1.5 shadow-sm"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Public Site</span>
              </a>
            </Button>

            {/* Admin Profile Dropdown */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-full p-0.5 border border-border/60 hover:border-primary/50 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Admin menu"
                >
                  <Avatar className="h-7 w-7">
                    {admin?.picture && (
                      <AvatarImage
                        src={admin.picture}
                        alt={adminName}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground pr-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-popover border-border/80 text-foreground p-2 shadow-xl"
              >
                <div className="flex items-center gap-3 px-2 py-2">
                  <Avatar className="h-9 w-9">
                    {admin?.picture && (
                      <AvatarImage
                        src={admin.picture}
                        alt={adminName}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {adminName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {admin?.email}
                    </p>
                  </div>
                </div>

                <div className="px-2 py-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Administrator
                  </span>
                </div>

                <DropdownMenuSeparator className="my-1.5 bg-border/50" />

                <DropdownMenuItem asChild>
                  <a
                    href="/"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer rounded px-2 py-1.5 text-xs font-medium"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View Public Website</span>
                  </a>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a
                    href="/profile"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer rounded px-2 py-1.5 text-xs font-medium"
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>My Profile</span>
                  </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5 bg-border/50" />

                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded px-2 py-1.5 text-xs font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Sub-navigation for mobile and tablet */}
      <div className="lg:hidden border-t border-border/50 bg-background/50 overflow-x-auto scrollbar-none">
        <div className="container mx-auto px-4 py-2 flex items-center gap-1.5 min-w-max">
          {ADMIN_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onChange(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{t.shortLabel || t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
