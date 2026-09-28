import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { DeleteTarget } from "../types";

interface SponsorDeleteDialogProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
  error: string | null;
}

export function SponsorDeleteDialog({
  target,
  onClose,
  onConfirm,
  deleting,
  error,
}: SponsorDeleteDialogProps) {
  if (!target) return null;

  const entityName =
    target.kind === "package"
      ? "Sponsor Package"
      : target.kind === "group"
      ? "Package Group"
      : "Sponsor Tier";

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border sm:rounded-2xl p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive w-fit">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Delete {entityName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">"{target.name}"</strong>?
            {target.kind === "group" && (
              <span className="block text-xs text-amber-400 mt-1">
                Note: Packages in this group will be moved to the unassigned list.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
            className="cursor-pointer font-semibold gap-1.5"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
