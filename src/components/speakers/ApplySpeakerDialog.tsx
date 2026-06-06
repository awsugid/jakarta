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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplySpeakerDialogProps {
  kind: string;
  slug: string;
  formTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type Step =
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

export function ApplySpeakerDialog({
  kind,
  slug,
  formTitle,
  open,
  onOpenChange,
}: ApplySpeakerDialogProps) {
  const { isSignedIn, signOut } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);
  const [formLink, setFormLink] = useState<string | null>(null);
  const [existingInfo, setExistingInfo] = useState<{
    submittedEmail: string;
    editable: boolean;
  } | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("intro");
      setError(null);
      setFormLink(null);
      setExistingInfo(null);
    }
  }, [open]);

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
    setStep("checking");
    setError(null);
    try {
      const discovery = await fetchDiscovery(kind, slug);
      if (discovery.exists) {
        setExistingInfo({
          submittedEmail: discovery.submitted_email || "",
          editable: discovery.editable,
        });
        if (discovery.editable) {
          // Get the form link to edit
          try {
            const link = await fetchFormLink(kind, slug);
            setFormLink(link.url);
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
        // Get FormBricks link
        try {
          const link = await fetchFormLink(kind, slug);
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
  }, [kind, slug, signOut]);

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

  // Render step content
  const renderContent = () => {
    switch (step) {
      case "intro":
        return (
          <div className="space-y-4">
            <DialogDescription className="text-base">
              You're applying for <strong>{formTitle}</strong>. We'll check if
              you already have an existing application and guide you through the
              process.
            </DialogDescription>
            <Button onClick={handleContinue} className="w-full">
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
              You already have an application for {formTitle} under{" "}
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
                  className="w-full"
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
              Your application for {formTitle} has been submitted and is no
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
              You're ready to apply for {formTitle}. Click below to open the
              application form in a new tab.
            </DialogDescription>
            {formLink && (
              <Button
                onClick={() => window.open(formLink, "_blank", "noopener")}
                className="w-full"
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
                className="flex-1"
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
          <DialogTitle>Apply — {formTitle}</DialogTitle>
        </DialogHeader>
        {isEmbedStep ? (
          <div className="flex-grow w-full h-full bg-muted/5 relative overflow-hidden flex items-center justify-center">
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
              className="w-full h-full border-0 absolute inset-0 bg-transparent"
              title={`Apply for ${formTitle}`}
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
