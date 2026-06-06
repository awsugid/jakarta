"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

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
  const gsiErrorRef = useRef(false);

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

  useEffect(() => {
    if (ready && window.google?.accounts?.id) {
      const container = document.getElementById(buttonId);
      if (container) {
        try {
          container.innerHTML = "";
          (window.google.accounts.id as any).renderButton(container, {
            type: compact ? "icon" : "standard",
            theme: "outline",
            size: "large",
            width: compact ? undefined : 300,
            shape: compact ? "circle" : "pill",
            text: text === "Login" ? "signin" : "signin_with",
          });

          if (onSignIn) {
            (window as any).__gsiOnSuccess = onSignIn;
          }

          // Check if the Google button actually rendered correctly after a short delay
          setTimeout(() => {
            const btn = container.querySelector('[role="button"]');
            const iframe = container.querySelector('iframe');
            if (iframe) {
              // Scale the iframe up to ensure the internal button completely covers our custom wrapper
              iframe.style.transform = 'scale(2)';
              iframe.style.transformOrigin = 'center center';
            }
            if (!btn && !iframe) {
              console.warn("[GoogleSignIn] renderButton produced no clickable element — enabling fallback");
              gsiErrorRef.current = true;
            }
          }, 1000);
        } catch (err) {
          console.error("Google renderButton failed:", err);
          gsiErrorRef.current = true;
        }
      }
    }
  }, [ready, buttonId, compact, onSignIn, text]);

  // Listen for GSI errors logged to console
  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;
    const handler = (...args: any[]) => {
      const msg = args.map(String).join(" ");
      if (msg.includes("GSI_LOGGER") && msg.includes("not allowed")) {
        gsiErrorRef.current = true;
      }
    };
    console.error = (...args: any[]) => { handler(...args); origError.apply(console, args); };
    console.warn = (...args: any[]) => { handler(...args); origWarn.apply(console, args); };
    return () => {
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  /**
   * Fallback click handler — fires when the Google iframe overlay didn't capture the click.
   * This happens when:
   *  - GIS failed to load or initialize (script blocked, origin error)
   *  - The iframe rendered at 0×0 due to a GIS error
   *  - An ad blocker blocked the Google script
   *
   * Uses google.accounts.id.prompt() (One Tap) as an alternative to the renderButton iframe.
   */
  const handleFallbackClick = useCallback(() => {
    // Try the globally-exposed signIn from AuthProvider first (uses prompt())
    if ((window as any).__gsiSignIn) {
      (window as any).__gsiSignIn();
      return;
    }

    // Direct prompt() fallback
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed?.()) {
            console.debug("[GoogleSignIn] One Tap natively blocked or closed");
          }
        });
      } catch (err) {
        console.error("[GoogleSignIn] prompt() failed:", err);
      }
      return;
    }

    // GIS not loaded at all
    console.warn("[GoogleSignIn] Google Identity Services not available");
  }, []);

  if (mounted && ready) {
    return (
      <div 
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-border/40 cursor-pointer select-none",
          compact ? "h-9 w-9 p-0" : "h-9 px-4 py-2 text-sm",
          className
        )}
        onClick={handleFallbackClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFallbackClick(); }}
      >
        {/* Visible custom styled elements */}
        <div className="flex items-center justify-center w-full h-full pointer-events-none">
          {!hideIcon && <GoogleIcon className="h-4 w-4 shrink-0" />}
          {!compact && <span className={cn(!hideIcon && "ml-2", "text-sm")}>{text}</span>}
        </div>

        {/* Invisible Google-branded button overlaid exactly on top */}
        <div
          id={buttonId}
          className="absolute inset-0 opacity-0 z-10 cursor-pointer flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&>div]:w-full [&>div]:h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold transition-colors bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
        compact ? "h-9 w-9 p-0" : "h-9 px-4 py-2 border border-border/40",
        className
      )}
      onClick={handleFallbackClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFallbackClick(); }}
    >
      {/* 1. Icon and optional text */}
      {!hideIcon && <GoogleIcon className="h-4 w-4 shrink-0" />}
      {!compact && <span className={cn(!hideIcon && "ml-2", "text-sm")}>{text}</span>}
    </div>
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
