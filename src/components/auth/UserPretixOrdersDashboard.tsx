"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { fetchUserPretixOrders } from "@/lib/api";
import type { UserPretixOrderSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  Ticket,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function UserPretixOrdersDashboard() {
  return (
    <AuthProvider>
      <UserPretixOrdersDashboardInner />
    </AuthProvider>
  );
}

function UserPretixOrdersDashboardInner() {
  const { user, isSignedIn, signOut } = useAuth();
  const [orders, setOrders] = useState<UserPretixOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    setNeedsRelogin(false);
    try {
      const data = await fetchUserPretixOrders({ limit: 50 });
      setOrders(data.orders ?? []);
    } catch (err: any) {
      if (err?.status === 401) {
        signOut();
        setNeedsRelogin(true);
        return;
      }
      setError(err?.message ?? "Could not load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isSignedIn && user) {
      loadOrders();
    }
  }, [mounted, isSignedIn, user]);

  if (!mounted) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="bg-card border border-border/80 rounded-xl p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with the Google account you used to register on Pretix to
            view your order history.
          </p>
          <div className="flex justify-center">
            <GoogleSignInButton text="Sign In with Google" useDialog={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Home
          </a>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            My Event Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ticket orders linked to {user.email}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : needsRelogin ? (
        <Card className="bg-card border-border/80">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center text-primary">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="text-lg font-semibold">Session expired</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Please sign in again to view your orders.
            </p>
            <div className="flex justify-center">
              <GoogleSignInButton text="Sign In Again" useDialog={false} />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-card border-border/80">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center text-destructive">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="text-lg font-semibold">Could not load orders</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error}
            </p>
            <Button onClick={loadOrders} variant="outline" className="mx-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="bg-card border-border/80">
          <CardContent className="p-12 text-center space-y-4">
            <div className="flex justify-center text-muted-foreground/45">
              <Ticket className="h-16 w-16" />
            </div>
            <h2 className="text-xl font-bold">No Pretix orders found</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No Pretix orders found for this Google email. If you bought
              tickets using a different email, log in with that account or use
              the Pretix customer portal link from your order confirmation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border/80 overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Attendees</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.orderCode}
                    className="border-t border-border/60 align-top"
                  >
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {o.orderCode}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {o.eventName || o.eventSlug}
                      </div>
                      {o.eventName && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {o.eventSlug}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(o.orderDatetime) ??
                        formatDate(o.eventDate) ??
                        "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.attendeeCount}
                      {o.checkedInCount != null && (
                        <span className="text-xs ml-1">
                          ({o.checkedInCount} checked in)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(o.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {o.total != null
                        ? `${o.currency ?? ""} ${o.total}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {o.pretixCustomerPortalUrl ? (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-primary hover:text-primary"
                        >
                          <a
                            href={o.pretixCustomerPortalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Manage <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid gap-3">
            {orders.map((o) => (
              <Card key={o.orderCode} className="bg-card border-border/80">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {o.eventName || o.eventSlug}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {o.orderCode}
                      </div>
                    </div>
                    {renderStatusBadge(o.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {formatDate(o.orderDatetime) ??
                          formatDate(o.eventDate) ??
                          "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>{o.attendeeCount}</span>
                      {o.checkedInCount != null && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </div>
                  {(o.total != null || o.pretixCustomerPortalUrl) && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      {o.total != null ? (
                        <span className="text-sm font-semibold">
                          {o.currency ?? ""} {o.total}
                        </span>
                      ) : (
                        <span />
                      )}
                      {o.pretixCustomerPortalUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                        >
                          <a
                            href={o.pretixCustomerPortalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Manage <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function renderStatusBadge(status: string) {
  const s = status.toLowerCase();
  let cls =
    "border-transparent bg-muted text-muted-foreground hover:bg-muted";
  let label = status;
  if (s === "paid" || s === "confirmed") {
    cls =
      "border-transparent bg-green-500/10 text-green-500 hover:bg-green-500/15";
    label = "Paid";
  } else if (s === "canceled" || s === "cancelled") {
    cls =
      "border-transparent bg-red-500/10 text-red-500 hover:bg-red-500/15";
    label = "Canceled";
  } else if (s === "pending" || s === "expired" || s === "expiration") {
    cls =
      "border-transparent bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/15";
    label = s === "expiration" ? "Pending" : status;
  }
  return <Badge className={cn("capitalize", cls)}>{label}</Badge>;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
