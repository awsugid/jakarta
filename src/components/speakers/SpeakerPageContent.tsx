"use client";

import React, { useState, useEffect } from "react";
import { SpeakerHero } from "@/components/speakers/SpeakerHero";
import { SpeakerBenefits } from "@/components/speakers/SpeakerBenefits";
import { SpeakerNotify } from "@/components/speakers/CFPForm";
import { ApplySpeakerDialog } from "@/components/speakers/ApplySpeakerDialog";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { fetchForms } from "@/lib/api";
import type { FormInfo } from "@/lib/types";

import { SpeakerTabs } from "@/components/speakers/SpeakerTabs";

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

  const [activeTab, setActiveTab] = useState<"community" | "monthly">("community");

  const speakerForm = forms.find((f) => f.slug === "speaker") ?? forms[0];
  const hasOpenForms = !!speakerForm?.is_active;

  const handleApply = (slug: string, title: string) => {
    setSelectedForm({ slug, title });
    setDialogOpen(true);
  };

  const handleHeroApply = () => {
    if (speakerForm) {
      handleApply(speakerForm.slug, speakerForm.title);
    } else {
      handleApply("speaker", "Speaker Application");
    }
  };

  return (
    <AuthProvider>
      <SpeakerHero
        kioskUrl={kioskUrl}
        isOpen={hasOpenForms}
        activeTab={activeTab}
        onApply={handleHeroApply}
      />

      <SpeakerTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        forms={forms}
        loading={loading}
        error={error}
        onApply={handleApply}
      />

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
