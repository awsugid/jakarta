"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminForms } from "@/lib/api";
import type { AdminFormSummary } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function FormSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (surveyId: string) => void;
}) {
  const [forms, setForms] = useState<AdminFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminForms()
      .then((data) => {
        if (cancelled) return;
        setForms(data);
        // Default to first active form (or first form) if caller has no value.
        if (!value) {
          const first =
            data.find((f) => f.is_active) ?? data[0];
          if (first) onChange(first.survey_id);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load forms.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading forms…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">Forms: {error}</div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No forms available.</div>
    );
  }

  const selected = forms.find((f) => f.survey_id === value) ?? forms[0];

  return (
    <Select
      value={selected?.survey_id}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger className="w-full sm:w-[280px] bg-background">
        <SelectValue placeholder="Select a form" />
      </SelectTrigger>
      <SelectContent>
        {forms.map((f) => (
          <SelectItem key={`${f.kind}-${f.slug}`} value={f.survey_id}>
            <span className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {f.kind}
              </span>
              <span className="font-medium">{f.title}</span>
              {!f.is_active && (
                <span className="text-xs text-muted-foreground">(archived)</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
