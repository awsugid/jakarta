"use client";

import React, { useState, useEffect } from "react";
import { VolunteerHero } from "@/components/volunteer/VolunteerHero";
import { VolunteerRoles } from "@/components/volunteer/VolunteerRoles";
import { VolunteerNotify } from "@/components/volunteer/VolunteerNotify";
import { ApplyVolunteerDialog } from "@/components/volunteer/ApplyVolunteerDialog";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { fetchForms } from "@/lib/api";
import type { FormInfo } from "@/lib/types";

interface VolunteerPageContentProps {
  kioskUrl?: string;
}

export function VolunteerPageContent({ kioskUrl }: VolunteerPageContentProps) {
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
        const data = await fetchForms("volunteer");
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

  const openCount = forms.filter((f) => f.is_active).length;

  const handleApply = (slug: string, title: string) => {
    setSelectedForm({ slug, title });
    setDialogOpen(true);
  };

  const handleMainApply = () => {
    setSelectedForm(null);
    setDialogOpen(true);
  };

  return (
    <AuthProvider>
      <VolunteerHero
        kioskUrl={kioskUrl}
        openCount={openCount}
        onApplyClick={handleMainApply}
      />

      {!loading && !error && (
        <VolunteerRoles forms={forms} onApply={handleApply} />
      )}

      {!loading && (error || forms.length === 0) && (
        <VolunteerRoles onApply={handleApply} />
      )}

      {loading && (
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground mt-4">
              Loading volunteer divisions...
            </p>
          </div>
        </section>
      )}

      <VolunteerNotify />

      <ApplyVolunteerDialog
        kind="volunteer"
        slug={selectedForm?.slug}
        formTitle={selectedForm?.title}
        forms={forms}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AuthProvider>
  );
}
