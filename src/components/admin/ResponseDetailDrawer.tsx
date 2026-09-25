"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdminFormbricksResponseDetail,
  updateAdminFormbricksResponseTags,
} from "@/lib/api";
import { addTag, prepareTagsForSave, removeTag, sameTag } from "@/lib/responseTags";
import type {
  AdminFormbricksAnswer,
  AdminFormbricksResponseDetail,
} from "@/lib/types";
import { Check, Copy, Loader2, X } from "lucide-react";

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
  availableTags,
  onTagsSaved,
  open,
  onOpenChange,
}: {
  responseId: string | null;
  surveyId: string | null;
  /** Distinct tags currently assigned in this survey (for suggestions). */
  availableTags: string[];
  onTagsSaved?: (responseId: string, tags: string[]) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [detail, setDetail] = useState<AdminFormbricksResponseDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tag editor state; savedTags mirrors the last persisted set for dirty-checking.
  const [tags, setTags] = useState<string[]>([]);
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingTags, setSavingTags] = useState(false);
  // Latest-prop mirror; guards in-flight saves against a response switch.
  const responseIdRef = useRef<string | null>(null);
  responseIdRef.current = responseId;

  useEffect(() => {
    if (!open || !responseId || !surveyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchAdminFormbricksResponseDetail(responseId, surveyId)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          const nextTags = d.tags ?? [];
          setTags(nextTags);
          setSavedTags(nextTags);
          setTagInput("");
          setTagError(null);
          setSaveError(null);
        }
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

  const dirty = tags.join("\u0000") !== savedTags.join("\u0000");

  const mutateTags = (next: string[]) => {
    setTags(next);
    setTagError(null);
  };

  const addFromInput = () => {
    const res = addTag(tags, tagInput, availableTags);
    if (res.error) {
      setTagError(res.error);
      return;
    }
    mutateTags(res.tags);
    setTagInput("");
  };

  const saveTags = async () => {
    if (!responseId || !surveyId) return;
    const prepared = prepareTagsForSave(tags);
    if (prepared.error) {
      setTagError(prepared.error);
      return;
    }
    const targetId = responseId;
    setSavingTags(true);
    setSaveError(null);
    setTagError(null);
    try {
      const res = await updateAdminFormbricksResponseTags(
        targetId,
        surveyId,
        prepared.tags,
      );
      // Response switched mid-save; drop the stale result.
      if (responseIdRef.current !== targetId) return;
      const saved = res.tags ?? [];
      setTags(saved);
      setSavedTags(saved);
      onTagsSaved?.(targetId, saved);
    } catch (err: any) {
      if (responseIdRef.current !== targetId) return;
      setSaveError(err?.message ?? "Failed to save tags.");
    } finally {
      if (responseIdRef.current === targetId) setSavingTags(false);
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

            {/* Tags */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tags
                </h3>
                {savingTags ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
                  </span>
                ) : dirty ? (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                ) : (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" aria-hidden="true" /> Saved
                  </span>
                )}
              </div>

              {tags.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Current tags">
                  {tags.map((t) => (
                    <li key={t}>
                      <Badge variant="secondary" className="gap-1 pr-1.5">
                        {t}
                        <button
                          type="button"
                          onClick={() => mutateTags(removeTag(tags, t))}
                          aria-label={`Remove tag ${t}`}
                          disabled={savingTags}
                          className="rounded-full p-0.5 hover:bg-secondary-foreground/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No tags yet.</p>
              )}

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addFromInput();
                }}
              >
                <Input
                  list={`tag-suggestions-${detail.id}`}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Choose an existing tag or type a new one"
                  aria-label="Add tag"
                  className="h-8 text-sm bg-background"
                  disabled={savingTags}
                />
                <datalist id={`tag-suggestions-${detail.id}`}>
                  {availableTags
                    .filter((t) => !tags.some((cur) => sameTag(cur, t)))
                    .map((t) => (
                      <option key={t} value={t} />
                    ))}
                </datalist>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={savingTags}
                >
                  Add
                </Button>
              </form>

              {(tagError || saveError) && (
                <p className="text-xs text-destructive" role="alert">
                  {tagError ?? saveError}
                </p>
              )}

              <div>
                <Button size="sm" onClick={saveTags} disabled={savingTags || !dirty}>
                  {savingTags && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save tags
                </Button>
              </div>
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
