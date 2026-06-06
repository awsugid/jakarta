"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  isSignedIn: boolean;
  idToken: string | null;
  gisReady: boolean;
  gisError: string | null;
  signIn: (onSuccess?: (user: AuthUser | null) => void) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isSignedIn: false,
  idToken: null,
  gisReady: false,
  gisError: null,
  signIn: () => {},
  signOut: () => {},
});

const TOKEN_KEY = "g_id_token";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

function getClientId(): string {
  const raw: string | undefined = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
  if (raw && raw !== "undefined") return raw;
  return "";
}

function parseJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      email: payload.email || "",
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new CustomEvent("auth-state-change", { detail: token }));
  } catch {
    /* storage unavailable */
  }
}

function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent("auth-state-change", { detail: null }));
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const [gisError, setGisError] = useState<string | null>(null);
  const pendingSuccessRef = useRef<((user: AuthUser | null) => void) | null>(
    null,
  );

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const parsed = parseJwtPayload(token);
      if (parsed) {
        setUser(parsed);
        setIdToken(token);
      } else {
        removeToken();
      }
    }

    const handleAuthChange = (e: Event) => {
      const token = (e as CustomEvent).detail;
      if (token) {
        const parsed = parseJwtPayload(token);
        if (parsed) {
          setUser(parsed);
          setIdToken(token);
        }
      } else {
        setUser(null);
        setIdToken(null);
      }
    };

    window.addEventListener("auth-state-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, []);

  const handleCredential = useCallback((credential: string) => {
    const parsed = parseJwtPayload(credential);
    if (!parsed) return;

    storeToken(credential);
    setUser(parsed);
    setIdToken(credential);
    pendingSuccessRef.current?.(parsed);
    pendingSuccessRef.current = null;
    (window as any).__gsiOnSuccess?.(parsed);
    (window as any).__gsiOnSuccess = null;
  }, []);

  useEffect(() => {
    const handleGsiCredential = (e: Event) => {
      const credential = (e as CustomEvent).detail;
      if (credential) {
        handleCredential(credential);
      }
    };
    window.addEventListener("gsi-credential-received", handleGsiCredential);
    return () => {
      window.removeEventListener("gsi-credential-received", handleGsiCredential);
    };
  }, [handleCredential]);

  useEffect(() => {
    const clientId = getClientId();
    if (!clientId) {
      setGisError(
        "Google Sign-In is not configured yet. Please set PUBLIC_GOOGLE_CLIENT_ID.",
      );
      return;
    }

    let cancelled = false;

    const initialize = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setGisError("Google Identity Services failed to load.");
        return;
      }

      if ((window as any).__gsiInitialized) {
        setGisReady(true);
        setGisError(null);
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              window.dispatchEvent(
                new CustomEvent("gsi-credential-received", {
                  detail: response.credential,
                })
              );
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        (window as any).__gsiInitialized = true;
        setGisReady(true);
        setGisError(null);
      } catch {
        setGisReady(false);
        setGisError("Google Identity Services initialization failed.");
      }
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      existing.addEventListener(
        "error",
        () => setGisError("Google Identity Services script failed to load."),
        { once: true },
      );
      return () => {
        cancelled = true;
        existing.removeEventListener("load", initialize);
      };
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () =>
      setGisError("Google Identity Services script failed to load.");
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;
    };
  }, [handleCredential]);

  const signIn = useCallback(
    (onSuccess?: (user: AuthUser | null) => void) => {
      if (!gisReady || !window.google?.accounts?.id) {
        if (gisError) alert(gisError);
        return;
      }

      pendingSuccessRef.current = onSuccess ?? null;
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          pendingSuccessRef.current = null;
          console.debug("Google One Tap: not displayed or skipped");
        }
      });
    },
    [gisError, gisReady],
  );

  // Expose signIn globally so other isolated React islands can call it.
  useEffect(() => {
    (window as any).__gsiSignIn = signIn;
    return () => {
      delete (window as any).__gsiSignIn;
    };
  }, [signIn]);

  const signOut = useCallback(() => {
    removeToken();
    setUser(null);
    setIdToken(null);
    pendingSuccessRef.current = null;
    window.google?.accounts?.id?.disableAutoSelect();
  }, []);

  // Sync user credentials to Formbricks SDK
  useEffect(() => {
    const syncFormbricks = () => {
      const fb = (window as any).formbricks;
      if (fb) {
        if (user) {
          fb.setUserId(user.email);
          fb.setAttribute("email", user.email);
          if (user.name) fb.setAttribute("name", user.name);
          console.debug("[AuthProvider] User synced to Formbricks:", user.email);
        } else {
          fb.logout();
          console.debug("[AuthProvider] Logged out from Formbricks");
        }
      }
    };
    
    syncFormbricks();
    
    // Poll to capture case where Formbricks script is still asynchronously loading
    const interval = setInterval(() => {
      const fb = (window as any).formbricks;
      if (fb) {
        syncFormbricks();
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const value: AuthContextValue = {
    user,
    isSignedIn: !!user,
    idToken,
    gisReady,
    gisError,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default AuthProvider;
