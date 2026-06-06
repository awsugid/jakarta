"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GoogleSignInButtonProps {
  onSignIn?: (user: AuthUser | null) => void;
  className?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  compact?: boolean;
  text?: string;
  hideIcon?: boolean;
}

export function GoogleSignInButton({
  onSignIn,
  className,
  compact = false,
  text = "Sign In",
  hideIcon = false,
}: GoogleSignInButtonProps) {
  const [buttonId] = useState(() => `g-btn-${Math.random().toString(36).substring(2, 11)}`);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      if (window.google?.accounts?.id) {
        setReady(true);
      }
    };
    check();
    const interval = window.setInterval(check, 200);
    return () => window.clearInterval(interval);
  }, []);

  // When the modal opens and GIS is ready, render the button
  useEffect(() => {
    if (open && ready && window.google?.accounts?.id) {
      // Small timeout to ensure DialogContent is mounted in the DOM
      const renderTimer = setTimeout(() => {
        const container = document.getElementById(buttonId);
        if (container) {
          try {
            container.innerHTML = "";
            (window as any).google.accounts.id.renderButton(container, {
              type: "standard",
              theme: "filled_black",
              size: "large",
              shape: "pill",
              text: "continue_with",
              logo_alignment: "center",
              width: 280, // Match a nice modal width
            });

            if (onSignIn) {
              (window as any).__gsiOnSuccess = (user: AuthUser | null) => {
                setOpen(false); // Close modal on success
                onSignIn(user);
              };
            } else {
              (window as any).__gsiOnSuccess = () => {
                setOpen(false);
              };
            }
          } catch (err) {
            console.error("Google renderButton failed:", err);
          }
        }
      }, 50);
      return () => clearTimeout(renderTimer);
    }
  }, [open, ready, buttonId, onSignIn]);

  if (!mounted) {
    return <div className={cn("h-9 w-20", className)} />;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer border border-border/40",
            compact ? "h-9 w-9 p-0" : "h-9 px-4 py-2 text-sm",
            className
          )}
        >
          {!hideIcon && <GoogleIcon className="h-4 w-4 shrink-0" />}
          {!compact && <span className={cn(!hideIcon && "ml-2", "text-sm")}>{text}</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] flex flex-col items-center py-10">
        <DialogHeader className="w-full flex flex-col items-center text-center space-y-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <GoogleIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Welcome Back</DialogTitle>
          <DialogDescription className="text-base">
            Sign in to your AWS Community Jakarta account to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center w-full min-h-[50px]">
          {ready ? (
            <div id={buttonId} className="flex items-center justify-center transition-opacity opacity-100" />
          ) : (
            <div className="w-[280px] h-[40px] bg-muted animate-pulse rounded-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function googleSignOut() {
  try {
    localStorage.removeItem("g_id_token");
    window.dispatchEvent(new CustomEvent("auth-state-change", { detail: null }));
  } catch {
    /* ignore */
  }
  window.google?.accounts?.id?.disableAutoSelect();
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="currentColor"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="currentColor"
      />
    </svg>
  );
}
