import { Loader2, RotateCcw, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SponsorSaveBarProps {
  dirty: boolean;
  saving: boolean;
  modifiedParts: string[];
  anyInvalid: boolean;
  saveError: string | null;
  onSave: () => void;
  onReset: () => void;
}

export function SponsorSaveBar({
  dirty,
  saving,
  modifiedParts,
  anyInvalid,
  saveError,
  onSave,
  onReset,
}: SponsorSaveBarProps) {
  if (!dirty && !saveError) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in slide-in-from-bottom duration-300">
      <div className="rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-md p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
              Unsaved Changes
              {modifiedParts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                  {modifiedParts.join(", ")}
                </Badge>
              )}
            </p>
            {anyInvalid && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                Please resolve validation errors before saving
              </p>
            )}
            {saveError && (
              <p className="text-[11px] text-destructive font-medium">
                {saveError}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={onReset}
            className="h-8 text-xs cursor-pointer gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving || anyInvalid}
            onClick={onSave}
            className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-1 min-w-[110px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
