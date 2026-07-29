"use client";

import { useState, useEffect } from "react";
import { useAuth, AuthProvider } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { UserMenu } from "@/components/auth/UserMenu";

export function HeaderAuth() {
  return (
    <AuthProvider>
      <HeaderAuthInner />
    </AuthProvider>
  );
}

function HeaderAuthInner() {
  const { isSignedIn, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a safe, clean structural placeholder that matches the login button's size to prevent layout shift during SSR/SSG
    return <div className="h-9 w-16" />;
  }

  if (!isSignedIn || !user) {
    return (
      <div className="flex items-center gap-2">
        <GoogleSignInButton
          text="Login"
          hideIcon={true}
          className="h-9 px-4 py-2 border border-border/40 hover:bg-primary/10 hover:text-primary transition-colors text-sm font-semibold"
        />
      </div>
    );
  }

  return <UserMenu />;
}
