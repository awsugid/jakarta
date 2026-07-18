"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth, probeAdmin, readAdminCache } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import type { AdminMe } from "@/lib/types";
import { Loader2, ShieldX, User } from "lucide-react";

type GuardState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "forbidden" }
  | { kind: "ok"; admin: AdminMe };

function ForbiddenRedirect() {
  const [remaining, setRemaining] = useState(3);
  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(tick);
          window.location.href = "/";
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);
  return (
    <div className="container mx-auto max-w-md px-4 py-16 text-center">
      <div className="bg-card border border-border/80 rounded-xl p-8 shadow-lg">
        <div className="flex justify-center mb-4 text-destructive">
          <ShieldX className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold mb-2">Permission Denied</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not authorized to view the admin dashboard.
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Redirecting to home in {remaining}…{" "}
          <a href="/" className="text-primary underline">Go now</a>
        </p>
      </div>
    </div>
  );
}

export function AdminGuard({
  children,
}: {
  children: (admin: AdminMe) => React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminGuardInner>{children}</AdminGuardInner>
    </AuthProvider>
  );
}

function AdminGuardInner({
  children,
}: {
  children: (admin: AdminMe) => React.ReactNode;
}) {
  const { isSignedIn, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<GuardState>({ kind: "loading" });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!isSignedIn || !user) {
      setState({ kind: "signed-out" });
      return;
    }
    // Cache short-circuit: if localStorage already says admin, skip network probe.
    const cached = readAdminCache();
    if (cached && cached.email === user.email && cached.isAdmin) {
      setState({
        kind: "ok",
        admin: {
          email: user.email,
          name: user.name,
          picture: user.picture,
          is_admin: true,
        },
      });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    probeAdmin(user.email).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setState({
          kind: "ok",
          admin: {
            email: user.email,
            name: user.name,
            picture: user.picture,
            is_admin: true,
          },
        });
      } else {
        setState({ kind: "forbidden" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, isSignedIn, user]);

  if (!mounted || state.kind === "loading") {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.kind === "signed-out") {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="bg-card border border-border/80 rounded-xl p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Admin Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with an authorized admin Google account to access the
            dashboard.
          </p>
          <div className="flex justify-center">
            <GoogleSignInButton text="Sign In with Google" useDialog={false} />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "forbidden") {
    return <ForbiddenRedirect />;
  }

  return <>{children(state.admin)}</>;
}
