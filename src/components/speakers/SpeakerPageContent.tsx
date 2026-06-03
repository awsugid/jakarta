"use client";

import React, { useState, useEffect } from "react";
import { SpeakerHero } from "@/components/speakers/SpeakerHero";
import { SpeakerBenefits } from "@/components/speakers/SpeakerBenefits";
import { SpeakerNotify } from "@/components/speakers/CFPForm";
import { ApplySpeakerDialog } from "@/components/speakers/ApplySpeakerDialog";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { fetchForms } from "@/lib/api";
import type { FormInfo } from "@/lib/types";

interface SpeakerPageContentProps {
  kioskUrl?: string;
}

export function SpeakerPageContent({ kioskUrl }: SpeakerPageContentProps) {
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchForms("speaker");
        if (!cancelled) {
          setForms(data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const speakerForm = forms.find((f) => f.slug === "speaker") ?? forms[0];
  const hasOpenForms = !!speakerForm?.is_active;

  const handleApply = (slug: string, title: string) => {
    setSelectedForm({ slug, title });
    setDialogOpen(true);
  };

  return (
    <AuthProvider>
      <SpeakerHero
        kioskUrl={kioskUrl}
        isOpen={hasOpenForms}
        onApply={
          hasOpenForms && speakerForm
            ? () => handleApply("speaker", speakerForm.title)
            : undefined
        }
      />

      {!loading && !error && <SpeakerBenefits />}

      {!loading && (error || forms.length === 0) && <SpeakerBenefits />}

      {loading && (
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground mt-4">
              Loading speaker formats...
            </p>
          </div>
        </section>
      )}

      <SpeakerNotify />

      {selectedForm && (
        <ApplySpeakerDialog
          kind="speaker"
          slug={selectedForm.slug}
          formTitle={selectedForm.title}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </AuthProvider>
  );
}
