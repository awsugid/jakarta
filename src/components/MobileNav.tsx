import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X, LogOut, FileText, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, AuthProvider } from "@/components/auth/AuthProvider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface MobileNavProps {
  items: { name: string; href: string }[];
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
  const { isSignedIn, user, signOut } = useAuth();

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
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="relative z-50"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {open &&
        createPortal(
          <>
            {/* Backdrop Overlay with fade-in */}
            <div
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
              onClick={() => setOpen(false)}
            />

            {/* Slide-out Sidebar Panel */}
            <div
              className="fixed right-0 top-0 bottom-0 z-[101] w-[290px] sm:w-[320px] bg-background/95 backdrop-blur-lg border-l border-border/40 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
            >
              <div className="overflow-y-auto max-h-[85vh] pr-1">
                {/* Header inside Menu */}
                <div className="flex items-center justify-between pb-6 border-b border-border/40 mb-6">
                  <div className="flex items-center gap-2">
                    <img
                      src="/android-chrome-192x192.png"
                      alt="Logo"
                      className="h-8 w-auto"
                    />
                    <span className="font-bold text-sm tracking-tight text-foreground">AWS UG Jakarta</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Logged In User Profile Card */}
                {isSignedIn && user && (
                  <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border/40 rounded-xl mb-6">
                    <Avatar className="h-10 w-10 border border-primary/20">
                      <AvatarImage src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{user.name || user.email}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Nav Links */}
                <nav className="flex flex-col gap-6">
                  {items.map((item) => {
                    const isActive =
                      currentPath === item.href ||
                      currentPath === `${item.href}/` ||
                      (item.href !== "/" && currentPath.startsWith(item.href));
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`text-lg font-semibold tracking-tight transition-all flex items-center justify-between hover:translate-x-1 duration-200 ${
                          isActive
                            ? "text-primary font-bold"
                            : "text-foreground/80 hover:text-primary"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <span>{item.name}</span>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </a>
                    );
                  })}
                </nav>

                {/* Account Section for Logged In User */}
                {isSignedIn && user ? (
                  <div className="flex flex-col gap-4 pt-6 border-t border-border/40 mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1">Account</p>
                    <a
                      href="/applications"
                      className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors flex items-center gap-2.5 py-1 px-1"
                      onClick={() => setOpen(false)}
                    >
                      <FileText className="h-4 w-4" />
                      <span>My Applications</span>
                    </a>
                    <button
                      onClick={() => {
                        setOpen(false);
                        if ((window as any).formbricks) {
                          (window as any).formbricks.track("submit-bug");
                        }
                      }}
                      className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors flex items-center gap-2.5 py-1 px-1 bg-transparent border-0 cursor-pointer text-left w-full focus:outline-none"
                    >
                      <Bug className="h-4 w-4" />
                      <span>Submit a Bug</span>
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setOpen(false);
                      }}
                      className="text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors flex items-center gap-2.5 py-1 px-1 bg-transparent border-0 cursor-pointer text-left w-full focus:outline-none"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  /* Login Trigger for Guest User */
                  <div className="pt-6 border-t border-border/40 mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1 mb-3">Join Us</p>
                    <GoogleSignInButton
                      text="Login"
                      hideIcon={true}
                      className="w-full justify-center h-10 border border-primary/20 hover:bg-primary/10 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Footer inside Menu */}
              <div className="pt-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground">AWS User Group Jakarta</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Connect, share, and build on AWS.</p>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
