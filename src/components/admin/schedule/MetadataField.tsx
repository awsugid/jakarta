import { useId, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMetadataValues,
  hasMetadataValue,
  metadataListError,
  toggleMetadataValue,
} from "@/lib/schedule-metadata";
import { cn } from "@/lib/utils";

interface MetadataFieldProps {
  label: string; // "Language" | "Level"
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  hint: string;
  placeholder?: string;
  allowCustom?: boolean;
}

const chipBase =
  "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-left text-xs font-medium leading-tight whitespace-normal break-words transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Multi-value chips: suggestion toggles + verbatim custom values. Empty stays [] (unset). */
export function MetadataField({
  label,
  values,
  onChange,
  suggestions,
  hint,
  placeholder = "",
  allowCustom = true,
}: MetadataFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const custom = values.filter((v) => !hasMetadataValue(suggestions, v));
  const error = metadataListError(values);

  function commit() {
    if (!draft.trim()) return;
    onChange(addMetadataValues(values, draft));
    setDraft("");
  }

  return (
    <fieldset className="min-w-0 space-y-2" aria-describedby={`${id}-hint`}>
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <legend className="text-sm font-medium text-foreground">{label}</legend>
        {values.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 rounded text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear<span className="sr-only"> {label.toLowerCase()}</span>
          </button>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">Not set</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const on = hasMetadataValue(values, s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggleMetadataValue(values, s))}
              className={cn(
                chipBase,
                on
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-dashed border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
              )}
            >
              {on ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {s}
            </button>
          );
        })}
        {custom.map((v) => (
          <span key={v} className={cn(chipBase, "border-primary/60 bg-primary/15 pr-1 text-foreground")}>
            <span className="min-w-0">{v}</span>
            <button
              type="button"
              aria-label={`Remove ${label.toLowerCase()} ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      {allowCustom && (
        <div className="flex min-w-0 gap-2">
          <Input
            id={`${id}-custom`}
            aria-label={`Add custom ${label.toLowerCase()}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the tag instead of submitting the session form.
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commit();
              }
            }}
            onBlur={commit} // typed-but-not-added text is never silently dropped
            placeholder={placeholder}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={commit} disabled={!draft.trim()} className="h-9 shrink-0">
            Add
          </Button>
        </div>
      )}
      <p id={`${id}-hint`} className="text-xs leading-snug text-muted-foreground">
        {hint}
      </p>
      {error && (
        <p role="alert" className="text-xs leading-snug text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
