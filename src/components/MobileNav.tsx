import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Menu,
  X,
  LogOut,
  FileText,
  Bug,
  User,
  Ticket,
  Shield,
  Home,
  Sparkles,
  Calendar,
  BookOpen,
  HandHeart,
  Mic,
  Handshake,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, AuthProvider } from "@/components/auth/AuthProvider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import type { NavItem } from "@/lib/navigation";

const NAV_ICONS: Record<string, LucideIcon> = {
  Home,
  Sparkles,
  Calendar,
  BookOpen,
  HandHeart,
  Mic,
  Handshake,
};

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  return (
    <AuthProvider>
      <MobileNavInner items={items} />
    </AuthProvider>
  );
}

function MobileNavInner({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const { isSignedIn, user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, [open]);

  const initials = user
    ? (user.name || user.email || "US")
        .split("@")[0]
        .split(" ")
        .map((n) => n[0] || "")
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "";

  return (
    <div className="lg:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="relative z-50 h-9 px-3 gap-2 rounded-xl bg-card/80 backdrop-blur-md border-border/80 text-foreground hover:bg-muted font-bold text-xs shadow-xs cursor-pointer"
      >
        <Menu className="h-4 w-4 text-primary" />
      </Button>

      {open &&
        createPortal(
          <>
            {/* Backdrop Overlay with fade-in */}
            <div
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
              onClick={() => setOpen(false)}
            />

            {/* Slide-out Sidebar Panel */}
            <div
              className="fixed right-0 top-0 bottom-0 z-[101] w-[320px] sm:w-[360px] bg-background/95 backdrop-blur-xl border-l border-border/60 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
            >
              <div className="overflow-y-auto max-h-[85vh] pr-1 space-y-6">
                {/* Header inside Menu */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/android-chrome-192x192.png"
                      alt="AWS User Group Jakarta Logo"
                      className="h-8 w-auto"
                    />
                    <span className="font-extrabold text-sm tracking-tight text-foreground">
                      AWS UG Jakarta
                    </span>
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

                {/* Logged In User Profile Card */}
                {isSignedIn && user && (
                  <div className="flex items-center gap-3 p-3 bg-card border border-border/60 rounded-2xl shadow-sm">
                    <Avatar className="h-10 w-10 border border-primary/30">
                      <AvatarImage src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{user.name || user.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Nav Links Grid */}
                <nav className="flex flex-col gap-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1 mb-1">
                    Navigation
                  </p>
                  {items.map((item) => {
                    const isActive =
                      currentPath === item.href ||
                      currentPath === `${item.href}/` ||
                      (item.href !== "/" && currentPath.startsWith(item.href));
                    const isComday = item.href === "/comday";

                    const Icon = NAV_ICONS[item.iconName] || ChevronRight;

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-sm font-bold tracking-tight transition-all flex items-center justify-between active:scale-[0.98] ${
                          isComday
                            ? "border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent text-orange-400 shadow-sm"
                            : isActive
                              ? "border-primary/40 bg-primary/10 text-primary shadow-xs"
                              : "border-border/40 bg-card/40 text-foreground/80 hover:text-foreground hover:bg-card hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isComday
                                ? "bg-orange-500/20 text-orange-400"
                                : isActive
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.name}</span>
                          {isComday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              2026
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <div className="h-2 w-2 rounded-full bg-primary shadow-xs" />
                        )}
                      </a>
                    );
                  })}
                </nav>

                {/* Account Section for Logged In User */}
                {isSignedIn && user ? (
                  <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1 mb-1">
                      Account
                    </p>
                    <a
                      href="/profile"
                      className="h-10 px-3 rounded-xl border border-border/40 bg-card/30 text-xs font-semibold text-foreground/90 hover:text-primary hover:bg-card transition-all flex items-center gap-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>My Profile</span>
                    </a>
                    <a
                      href="/applications"
                      className="h-10 px-3 rounded-xl border border-border/40 bg-card/30 text-xs font-semibold text-foreground/90 hover:text-primary hover:bg-card transition-all flex items-center gap-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>My Applications</span>
                    </a>
                    <a
                      href="/orders"
                      className="h-10 px-3 rounded-xl border border-border/40 bg-card/30 text-xs font-semibold text-foreground/90 hover:text-primary hover:bg-card transition-all flex items-center gap-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>My Event Orders</span>
                    </a>
                    {isAdmin && (
                      <a
                        href="/admin"
                        className="h-10 px-3 rounded-xl border border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all flex items-center gap-2.5"
                        onClick={() => setOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setOpen(false);
                        if ((window as any).formbricks) {
                          (window as any).formbricks.track("submit-bug");
                        }
                      }}
                      className="h-10 px-3 rounded-xl border border-border/40 bg-card/30 text-xs font-semibold text-foreground/90 hover:text-primary hover:bg-card transition-all flex items-center gap-2.5 cursor-pointer text-left w-full"
                    >
                      <Bug className="h-4 w-4 text-muted-foreground" />
                      <span>Submit a Bug</span>
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setOpen(false);
                      }}
                      className="h-10 px-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2.5 cursor-pointer text-left w-full mt-1"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  /* Login Trigger for Guest User */
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1 mb-2.5">
                      Join Us
                    </p>
                    <GoogleSignInButton
                      text="Sign In with Google"
                      hideIcon={false}
                      useDialog={false}
                      className="w-full justify-center h-11 text-xs font-bold rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Footer inside Menu */}
              <div className="pt-4 border-t border-border/40 shrink-0">
                <p className="text-xs font-bold text-foreground">AWS User Group Jakarta</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Indonesia's largest developer community.
                </p>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
