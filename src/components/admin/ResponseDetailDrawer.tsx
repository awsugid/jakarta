"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAdminFormbricksResponseDetail } from "@/lib/api";
import type {
  AdminFormbricksAnswer,
  AdminFormbricksResponseDetail,
} from "@/lib/types";
import { Check, Copy, Loader2 } from "lucide-react";

function renderValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function AnswerRow({ answer }: { answer: AdminFormbricksAnswer }) {
  const text = renderValue(answer.value);
  const isMultiline = text.includes("\n") || text.length > 120;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-foreground">
          {answer.label || answer.question_id}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-mono shrink-0"
        >
          {answer.type}
        </Badge>
      </div>
      {isMultiline ? (
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words bg-muted/40 rounded-md p-2">
          {text || "(empty)"}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground break-words">
          {text || (
            <span className="italic text-muted-foreground/60">(empty)</span>
          )}
        </p>
      )}
    </div>
  );
}

export function ResponseDetailDrawer({
  responseId,
  surveyId,
  open,
  onOpenChange,
}: {
  responseId: string | null;
  surveyId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [detail, setDetail] = useState<AdminFormbricksResponseDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !responseId || !surveyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchAdminFormbricksResponseDetail(responseId, surveyId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(err?.message ?? "Failed to load response detail.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, responseId, surveyId]);

  const copyId = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-card border-border/80 text-foreground w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-bold">Response Detail</SheetTitle>
          <SheetDescription className="sr-only">
            Detailed view of a single Formbricks response.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {detail.finished ? (
                <Badge className="border-transparent bg-green-500/10 text-green-500">
                  Finished
                </Badge>
              ) : (
                <Badge className="border-transparent bg-yellow-500/10 text-yellow-500">
                  In Progress
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {detail.submitted_at
                  ? `Submitted ${new Date(detail.submitted_at).toLocaleString()}`
                  : detail.updated_at
                    ? `Updated ${new Date(detail.updated_at).toLocaleString()}`
                    : "No timestamp"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1 truncate">
                {detail.id}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={copyId}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="text-xs ml-1">
                  {copied ? "Copied" : "Copy ID"}
                </span>
              </Button>
            </div>

            {detail.metadata.contact_id && (
              <div className="text-xs text-muted-foreground">
                Contact:{" "}
                <code className="font-mono">
                  {detail.metadata.contact_id}
                </code>
              </div>
            )}

            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Answers ({detail.answers.length})
              </h3>
              <div>
                {detail.answers.map((a) => (
                  <AnswerRow
                    key={a.question_id}
                    answer={a}
                  />
                ))}
                {detail.answers.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No answers recorded.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No response selected.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
