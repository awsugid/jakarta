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
import { fetchAdminMe } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isSignedIn: boolean;
  idToken: string | null;
  gisReady: boolean;
  gisError: string | null;
  isAdmin: boolean;
  signIn: (onSuccess?: (user: AuthUser | null) => void) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isSignedIn: false,
  idToken: null,
  gisReady: false,
  gisError: null,
  isAdmin: false,
  signIn: () => {},
  signOut: () => {},
});

const TOKEN_KEY = "g_id_token";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client?hl=en";

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

// localStorage-backed admin cache. Survives client-side navigation (Astro MPA
// rebuilds JS context per page, so module-level cache is wiped every nav).
const ADMIN_CACHE_KEY = "g_admin_cache";
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface AdminCacheEntry {
  email: string;
  isAdmin: boolean;
  ts: number;
}

export function readAdminCache(): AdminCacheEntry | null {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminCacheEntry;
    if (Date.now() - parsed.ts > ADMIN_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAdminCache(email: string, isAdmin: boolean) {
  try {
    const entry: AdminCacheEntry = { email, isAdmin, ts: Date.now() };
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* storage unavailable */
  }
}

function clearAdminCache() {
  try {
    localStorage.removeItem(ADMIN_CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
}

// Module-level in-flight dedupe: prevents concurrent islands on the SAME page
// from each firing a network call when no localStorage cache exists yet.
let inFlight: { email: string; promise: Promise<boolean> } | null = null;

export function probeAdmin(email: string): Promise<boolean> {
  // 1. Check localStorage cache (survives navigation).
  const cached = readAdminCache();
  if (cached && cached.email === email) {
    return Promise.resolve(cached.isAdmin);
  }
  // 2. Dedupe concurrent probes on same page.
  if (inFlight && inFlight.email === email) {
    return inFlight.promise;
  }
  // 3. Network probe.
  const promise = fetchAdminMe()
    .then(() => {
      writeAdminCache(email, true);
      inFlight = null;
      return true;
    })
    .catch((err: any) => {
      if (err?.status !== 401) {
        writeAdminCache(email, false);
      }
      inFlight = null;
      return false;
    });
  inFlight = { email, promise };
  return promise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    const token = getStoredToken();
    if (token) return parseJwtPayload(token);
    return null;
  });
  const [idToken, setIdToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredToken();
  });
  const [gisReady, setGisReady] = useState(false);
  const [gisError, setGisError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
          use_fedcm_for_prompt: true,
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
        // Under FedCM, the browser natively controls the UI.
        // Legacy UI status methods (isNotDisplayed, isSkippedMoment) are deprecated 
        // and trigger console warnings. We simply catch FedCM AbortErrors silently.
        if ((notification as any).isNotDisplayed?.()) {
           pendingSuccessRef.current = null;
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
    setIsAdmin(false);
    clearAdminCache();
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

  // Probe admin status once per user change. Cached in localStorage so client-side
  // navigation does NOT re-probe (TTL-bounded).
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    // Optimistic: hydrate from cache before network resolves.
    const cached = readAdminCache();
    if (cached && cached.email === user.email) {
      setIsAdmin(cached.isAdmin);
      return; // trust cache within TTL; no network call.
    }
    let cancelled = false;
    probeAdmin(user.email).then((ok) => {
      if (!cancelled) setIsAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value: AuthContextValue = {
    user,
    isSignedIn: !!user,
    idToken,
    gisReady,
    gisError,
    isAdmin,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default AuthProvider;
