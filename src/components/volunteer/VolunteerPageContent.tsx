"use client";

import React, { useState, useEffect } from "react";
import { VolunteerHero } from "@/components/volunteer/VolunteerHero";
import { VolunteerRoles } from "@/components/volunteer/VolunteerRoles";
import { VolunteerNotify } from "@/components/volunteer/VolunteerNotify";
import { VolunteerSpotlight } from "@/components/volunteer/VolunteerSpotlight";
import { ApplyVolunteerDialog } from "@/components/volunteer/ApplyVolunteerDialog";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { fetchForms } from "@/lib/api";
import type { FormInfo, PersonItem } from "@/lib/types";

interface VolunteerPageContentProps {
  kioskUrl?: string;
  volunteers?: PersonItem[];
}

export function VolunteerPageContent({
  kioskUrl,
  volunteers = [],
}: VolunteerPageContentProps) {
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
    const CACHE_KEY = "awsug_volunteer_forms_cache";

    // Instant hydration from sessionStorage if available
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setForms(parsed);
          setLoading(false);
        }
      }
    } catch {
      /* ignore */
    }

    async function load() {
      try {
        const data = await fetchForms("volunteer");
        if (!cancelled) {
          setForms(data);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
          } catch {
            /* ignore */
          }
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
        totalCount={forms.length}
        onApplyClick={handleMainApply}
      />

      <VolunteerRoles
        forms={forms}
        loading={loading}
        onApply={handleApply}
      />

      {volunteers.length > 0 && <VolunteerSpotlight people={volunteers} />}

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
