"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  fetchApplicationsSummary,
  fetchApplicationResponse,
  fetchFormLink,
  fetchFormSchema,
} from "@/lib/api";
import type {
  UserApplicationSummary,
  ApplicationResponseDetail,
  FormSchema,
  FormSchemaQuestion,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Eye,
  Edit2,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Format response data keys to human-friendly labels
function formatQuestionKey(key: string, index?: number): string {
  if (!key) return key;

  // Detect FormBricks question IDs (lowercase alphanumeric, typically 20-25 chars)
  // Example: "g5lahqsqzv35v5o303da7zox"
  if (/^[a-z0-9]{20,}$/i.test(key)) {
    // These are FormBricks internal IDs, not human-readable
    // Return a numbered label if index is provided
    return index !== undefined ? `Question ${index + 1}` : "Question";
  }

  // Format semantic keys (camelCase, snake_case, etc.) into readable text
  return key
    .replace(/[-_]+/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function UserApplicationsDashboard() {
  return (
    <AuthProvider>
      <UserApplicationsDashboardInner />
    </AuthProvider>
  );
}

function UserApplicationsDashboardInner() {
  const { user, isSignedIn, signOut } = useAuth();
  const [applications, setApplications] = useState<UserApplicationSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Modals for viewing and editing
  const [viewDetail, setViewDetail] = useState<UserApplicationSummary | null>(
    null,
  );
  const [editDetail, setEditDetail] = useState<UserApplicationSummary | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplicationsSummary();
      setApplications(data);
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes("Invalid Google ID token")) {
        signOut();
        return;
      }
      setError(
        err?.message ||
          "Failed to fetch applications. Make sure you are signed in.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isSignedIn && user) {
      loadApplications();
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
              <User className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please sign in with your Google account to view and manage your
            submitted volunteer or speaker applications.
          </p>
          <div className="flex justify-center">
            <GoogleSignInButton text="Sign In with Google" useDialog={false} />
          </div>
        </div>
      </div>
    );
  }

  const renderStatusBadge = (app: UserApplicationSummary) => {
    if (app.finished && app.editable) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Open to Edit
        </span>
      );
    } else if (app.finished && !app.editable) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Submitted (View Only)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          In Progress
        </span>
      );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Home
          </a>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            My Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review or update your talk CFP and volunteer submissions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-card/60 border border-border/80 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-border/80 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="flex justify-center text-destructive">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="text-lg font-semibold">Could not load applications</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error}
          </p>
          <Button
            onClick={loadApplications}
            variant="outline"
            className="mx-auto"
          >
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-xl p-12 text-center shadow-sm space-y-4">
          <div className="flex justify-center text-muted-foreground/45">
            <FileText className="h-16 w-16" />
          </div>
          <h2 className="text-xl font-bold">No active applications</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You haven't submitted any speaker talk proposals or volunteer
            applications yet for the AWS User Group Jakarta.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild variant="default">
              <a href="/speakers">Apply as Speaker</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/volunteer">Apply as Volunteer</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <div
              key={`${app.kind}-${app.slug}`}
              className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm hover:border-primary/20 transition-all"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {app.title}
                  </h3>
                  {renderStatusBadge(app)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                    {app.kind}
                  </span>
                  <span>•</span>
                  <span>ID: {app.response_id.substring(0, 8)}...</span>
                </div>
                {app.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 pt-1.5">
                    {app.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDetail(app)}
                  className="flex items-center gap-1.5 text-xs h-9 px-3 border-border/60 hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Details
                </Button>
                {app.editable && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setEditDetail(app)}
                    className="flex items-center gap-1.5 text-xs h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/95 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Application Response Dialog */}
      <ViewAppDialog app={viewDetail} onClose={() => setViewDetail(null)} />

      {/* Edit Application Dialog */}
      <EditAppDialog
        app={editDetail}
        onClose={() => {
          setEditDetail(null);
          loadApplications();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog Sub-components
// ---------------------------------------------------------------------------

function ViewAppDialog({
  app,
  onClose,
}: {
  app: UserApplicationSummary | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ApplicationResponseDetail | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (app) {
      setLoading(true);
      setError(null);
      setDetail(null);
      setSchema(null);

      // Fetch application response (required)
      fetchApplicationResponse(app.kind, app.slug)
        .then((responseData) => {
          setDetail(responseData);

          // Try to fetch schema (optional - gracefully fail if endpoint doesn't exist)
          return fetchFormSchema(app.kind, app.slug)
            .then((schemaData) => {
              setSchema(schemaData);
            })
            .catch((err) => {
              // Schema fetch failed - not critical, just log and continue
              console.log(
                "Schema fetch failed (falling back to numbered questions):",
                err,
              );
            });
        })
        .catch((err) => {
          setError(err?.message || "Failed to load application details.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [app]);

  if (!app) return null;

  return (
    <Dialog open={!!app} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border/80 text-foreground sm:max-w-2xl lg:max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application — {app.title}</DialogTitle>
          <DialogDescription>
            Submitted on{" "}
            {detail?.response.submitted_at
              ? new Date(detail.response.submitted_at).toLocaleDateString(
                  undefined,
                  {
                    dateStyle: "long",
                  },
                )
              : "..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading your answers...
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-destructive">{error}</div>
        ) : detail ? (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-background border border-border/40 p-4 divide-y divide-border/20">
              {Object.entries(detail.response.data).length > 0 ? (
                Object.entries(detail.response.data).map(
                  ([key, value], index) => {
                    const schemaQ: FormSchemaQuestion | undefined =
                      schema?.questions[key];
                    const label =
                      schemaQ?.label ?? formatQuestionKey(key, index);
                    const qType = schemaQ?.type ?? "openText";

                    // Resolve the display value
                    let stringValue = "";
                    if (value === null || value === undefined) {
                      stringValue = "-";
                    } else if (Array.isArray(value)) {
                      stringValue = value.join(", ");
                    } else if (typeof value === "object") {
                      stringValue = JSON.stringify(value);
                    } else {
                      stringValue = String(value);
                    }
                    if (stringValue.trim() === "") stringValue = "-";

                    const isEmpty = stringValue === "-";

                    return (
                      <div key={key} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">
                          {label}
                        </p>
                        {qType === "fileUpload" && !isEmpty ? (
                          <a
                            href={stringValue}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={stringValue}
                              alt={label}
                              className="max-h-48 rounded-md border border-border/40 object-contain"
                              onError={(e) => {
                                // If image fails to load, fall back to a link
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                                (
                                  e.currentTarget
                                    .nextSibling as HTMLElement | null
                                )?.removeAttribute("hidden");
                              }}
                            />
                            <span
                              hidden
                              className="text-sm text-foreground break-words"
                            >
                              {stringValue}
                            </span>
                          </a>
                        ) : (
                          <p className="text-sm text-foreground break-words leading-relaxed whitespace-pre-wrap">
                            {stringValue}
                          </p>
                        )}
                      </div>
                    );
                  },
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data captured for this response.
                </p>
              )}
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Close
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditAppDialog({
  app,
  onClose,
}: {
  app: UserApplicationSummary | null;
  onClose: () => void;
}) {
  const [formLinkUrl, setFormLinkUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (app) {
      setLoading(true);
      setError(null);
      setFormLinkUrl(null);
      setSubmitted(false);
      setIframeLoading(true);

      fetchFormLink(app.kind, app.slug, "edit")
        .then((data) => {
          let url = data.url;
          if (url.includes("skipPrefilled=true")) {
            url = url.replace("skipPrefilled=true", "skipPrefilled=false");
          } else if (!url.includes("skipPrefilled=")) {
            url += (url.includes("?") ? "&" : "?") + "skipPrefilled=false";
          }
          setFormLinkUrl(url);
        })
        .catch((err) => {
          setError(err?.message || "Failed to load prefilled form link.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [app]);

  // Listen for FormBricks survey completion inside the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "formbricksSurveyCompleted") {
        setSubmitted(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!app) return null;

  const isEmbedActive = !!formLinkUrl && !submitted;

  return (
    <Dialog open={!!app} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "bg-card border-border/80 text-foreground flex flex-col transition-all duration-300 ease-in-out",
          isEmbedActive
            ? "max-w-4xl w-[95vw] h-[85vh] max-h-[800px] p-0 gap-0 overflow-hidden"
            : "sm:max-w-md p-6",
        )}
      >
        <DialogHeader
          className={cn(
            isEmbedActive ? "px-6 py-4 border-b border-border/40" : "",
          )}
        >
          <DialogTitle>Edit — {app.title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Preparing your prefilled application...
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        ) : submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500 animate-bounce" />
            </div>
            <DialogTitle className="text-center">
              Submission Updated!
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Your edits have been successfully submitted. We will review your
              updated profile shortly.
            </DialogDescription>
            <Button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95"
            >
              Done
            </Button>
          </div>
        ) : formLinkUrl ? (
          <div className="flex-grow w-full h-full bg-muted/5 relative overflow-y-auto flex flex-col">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 gap-3 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading your application form...
                </p>
              </div>
            )}
            <iframe
              src={formLinkUrl}
              className="w-full flex-grow min-h-[650px] border-0 bg-transparent"
              title={`Edit application for ${app.title}`}
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
