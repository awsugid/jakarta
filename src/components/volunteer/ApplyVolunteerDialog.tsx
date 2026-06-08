"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchDiscovery, fetchFormLink } from "@/lib/api";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import type { FormInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { divisions, nameToSlug } from "./VolunteerRoles";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplyVolunteerDialogProps {
  kind: string;
  slug?: string;
  formTitle?: string;
  forms?: FormInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type Step =
  | "select_division"
  | "intro"
  | "auth"
  | "checking"
  | "existing"
  | "submitted"
  | "ready"
  | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplyVolunteerDialog({
  kind,
  slug,
  formTitle,
  forms = [],
  open,
  onOpenChange,
}: ApplyVolunteerDialogProps) {
  const { isSignedIn, signOut } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [formLink, setFormLink] = useState<string | null>(null);
  const [existingInfo, setExistingInfo] = useState<{
    submittedEmail: string;
    editable: boolean;
  } | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (slug && formTitle) {
        setSelectedSlug(slug);
        setSelectedTitle(formTitle);
        setStep("intro");
      } else {
        setSelectedSlug("");
        setSelectedTitle("");
        setStep("select_division");
      }
      setError(null);
      setFormLink(null);
      setExistingInfo(null);
    }
  }, [open, slug, formTitle]);

  const [iframeLoading, setIframeLoading] = useState(true);

  // Reset iframe loading state when formLink changes
  useEffect(() => {
    if (formLink) {
      setIframeLoading(true);
    }
  }, [formLink]);

  // Listen for FormBricks survey completion message inside the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "formbricksSurveyCompleted") {
        setStep("submitted");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const checkApplication = useCallback(async () => {
    if (!selectedSlug) return;
    setStep("checking");
    setError(null);
    try {
      const discovery = await fetchDiscovery(kind, selectedSlug);
      if (discovery.exists) {
        setExistingInfo({
          submittedEmail: discovery.submitted_email || "",
          editable: discovery.editable,
        });
        if (discovery.editable) {
          try {
            const link = await fetchFormLink(kind, selectedSlug, "edit");
            let url = link.url;
            if (url.includes("skipPrefilled=true")) {
              url = url.replace("skipPrefilled=true", "skipPrefilled=false");
            } else if (!url.includes("skipPrefilled=")) {
              url += (url.includes("?") ? "&" : "?") + "skipPrefilled=false";
            }
            setFormLink(url);
          } catch (e: any) {
            if (e?.status === 401) {
              signOut();
              setStep("auth");
              return;
            }
          }
          setStep("existing");
        } else {
          setStep("submitted");
        }
      } else {
        try {
          const link = await fetchFormLink(kind, selectedSlug);
          setFormLink(link.url);
          setStep("ready");
        } catch (e: any) {
          if (e?.status === 401) {
            signOut();
            setStep("auth");
          } else {
            setError(e?.message || "Failed to get application form link.");
            setStep("error");
          }
        }
      }
    } catch (e: any) {
      if (e?.status === 401) {
        signOut();
        setStep("auth");
      } else {
        setError(e?.message || "Failed to check application status.");
        setStep("error");
      }
    }
  }, [kind, selectedSlug, signOut]);

  const handleContinue = useCallback(() => {
    if (isSignedIn) {
      checkApplication();
    } else {
      setStep("auth");
    }
  }, [isSignedIn, checkApplication]);

  const handleSignInComplete = useCallback(() => {
    checkApplication();
  }, [checkApplication]);

  const renderContent = () => {
    switch (step) {
      case "select_division": {
        const activeForms = forms.filter((f) => f.is_active && f.kind === kind);
        return (
          <div className="space-y-4">
            <DialogDescription className="text-base text-muted-foreground">
              Please select the volunteer division you are interested in
              joining.
            </DialogDescription>
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/75 block">
                Available Divisions
              </label>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
                {activeForms.length > 0 ? (
                  activeForms.map((form) => {
                    const divisionMeta = divisions.find(
                      (d) => nameToSlug[d.name] === form.slug,
                    );
                    const IconComponent = divisionMeta?.icon || CheckCircle2;
                    const isSelected = selectedSlug === form.slug;

                    return (
                      <div
                        key={form.slug}
                        onClick={() => {
                          setSelectedSlug(form.slug);
                          setSelectedTitle(form.title);
                        }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_8px_rgba(249,115,22,0.1)]"
                            : "bg-background border-border/60 hover:border-border/80 hover:bg-muted/10",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-md shrink-0 transition-colors mt-0.5",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <h4
                            className={cn(
                              "text-sm font-semibold tracking-tight transition-colors",
                              isSelected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {form.title}
                          </h4>
                          {divisionMeta?.description && (
                            <p className="text-xs text-muted-foreground leading-normal line-clamp-2">
                              {divisionMeta.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-sm text-center text-muted-foreground border border-dashed border-border rounded-lg">
                    No divisions currently active
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                if (selectedSlug && selectedTitle) {
                  setStep("intro");
                }
              }}
              disabled={!selectedSlug}
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              Continue
            </Button>
          </div>
        );
      }

      case "intro":
        return (
          <div className="space-y-4">
            <DialogDescription className="text-base">
              You're applying for <strong>{selectedTitle}</strong>. We'll check
              if you already have an existing application and guide you through
              the process.
            </DialogDescription>
            <Button
              onClick={handleContinue}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95"
            >
              Continue
            </Button>
          </div>
        );

      case "auth":
        return (
          <div className="space-y-4 text-center">
            <DialogDescription className="text-base">
              Please sign in with your Google account to continue. We use your
              email to match your application and prevent duplicates.
            </DialogDescription>
            <div className="flex justify-center">
              <GoogleSignInButton onSignIn={handleSignInComplete} useDialog={false} />
            </div>
          </div>
        );

      case "checking":
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <DialogDescription className="text-base">
              Checking your application status...
            </DialogDescription>
          </div>
        );

      case "existing":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Application Found</span>
            </div>
            <DialogDescription className="text-base">
              You already have an application for {selectedTitle} under{" "}
              <strong>{existingInfo?.submittedEmail || "your email"}</strong>.
            </DialogDescription>
            {existingInfo?.editable && formLink ? (
              <>
                <DialogDescription className="text-sm">
                  The form is still editable. Click below to review or update
                  your application.
                </DialogDescription>
                <Button
                  onClick={() => window.open(formLink, "_blank", "noopener")}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Edit Your Application
                </Button>
              </>
            ) : (
              <DialogDescription className="text-sm text-muted-foreground">
                This application can no longer be edited. If you need to make
                changes, please contact the organizers.
              </DialogDescription>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        );

      case "submitted":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Application Submitted</span>
            </div>
            <DialogDescription className="text-base">
              Your application for {selectedTitle} has been submitted and is no
              longer editable. Thank you! The organizers will review your
              submission.
            </DialogDescription>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        );

      case "ready":
        return (
          <div className="space-y-4">
            <DialogDescription className="text-base">
              You're ready to apply for {selectedTitle}. Click below to open the
              application form in a new tab.
            </DialogDescription>
            {formLink && (
              <Button
                onClick={() => window.open(formLink, "_blank", "noopener")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Application Form
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Something went wrong</span>
            </div>
            <DialogDescription className="text-base">
              {error || "An unexpected error occurred. Please try again later."}
            </DialogDescription>
            <div className="flex gap-2">
              <Button
                onClick={checkApplication}
                variant="default"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        );
    }
  };

  const isEmbedStep =
    (step === "ready" || (step === "existing" && existingInfo?.editable)) &&
    !!formLink;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-card border-border/80 text-foreground flex flex-col transition-all duration-300 ease-in-out",
          isEmbedStep
            ? "max-w-4xl w-[95vw] h-[85vh] max-h-[800px] p-0 gap-0 overflow-hidden"
            : "sm:max-w-md p-6",
        )}
      >
        <DialogHeader
          className={cn(
            isEmbedStep ? "px-6 py-4 border-b border-border/40" : "",
          )}
        >
          <DialogTitle>Apply — {selectedTitle || "Volunteer"}</DialogTitle>
        </DialogHeader>
        {isEmbedStep ? (
          <div className="flex-grow w-full h-full bg-muted/5 relative overflow-y-auto flex flex-col">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 gap-3 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading application form...
                </p>
              </div>
            )}
            <iframe
              src={formLink}
              className="w-full flex-grow min-h-[650px] border-0 bg-transparent"
              title={`Apply for ${selectedTitle}`}
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        ) : (
          <div className={cn(isEmbedStep ? "" : "mt-2")}>{renderContent()}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
