import { useState, type FormEvent } from "react";
import { Award, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SponsorTierAccent } from "@/lib/types";
import { TierAccentBadge } from "../atoms/TierAccentBadge";

interface AddTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTier: (data: {
    label: string;
    thresholdIdr: number;
    thresholdUsd?: number | null;
    accent: SponsorTierAccent;
  }) => Promise<void>;
  existingLabels: string[];
  existingThresholds: number[];
}

const ACCENT_OPTIONS: { id: SponsorTierAccent; label: string }[] = [
  { id: "platinum", label: "Platinum (Silver-White)" },
  { id: "gold", label: "Gold (Amber)" },
  { id: "silver", label: "Silver (Zinc)" },
  { id: "bronze", label: "Bronze (Warm Orange)" },
  { id: "default", label: "Default (Primary Brand)" },
];

export function AddTierDialog({
  open,
  onOpenChange,
  onCreateTier,
  existingLabels,
  existingThresholds,
}: AddTierDialogProps) {
  const [label, setLabel] = useState("");
  const [threshold, setThreshold] = useState("");
  const [thresholdUsd, setThresholdUsd] = useState("");
  const [accent, setAccent] = useState<SponsorTierAccent>("default");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Tier label is required.");
      return;
    }
    if (existingLabels.some((l) => l.toLowerCase() === trimmedLabel.toLowerCase())) {
      setError("A tier with this label already exists.");
      return;
    }
    const threshNum = Number(threshold.trim());
    if (!threshold.trim() || isNaN(threshNum) || threshNum <= 0) {
      setError("Valid IDR threshold is required.");
      return;
    }
    if (existingThresholds.includes(threshNum)) {
      setError("A tier with this exact IDR threshold already exists.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await onCreateTier({
        label: trimmedLabel,
        thresholdIdr: threshNum,
        thresholdUsd: thresholdUsd.trim() ? Number(thresholdUsd.trim()) : null,
        accent,
      });
      setLabel("");
      setThreshold("");
      setThresholdUsd("");
      setAccent("default");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create tier.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border sm:rounded-2xl p-6">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Add Sponsor Tier
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a sponsorship tier threshold (e.g. "Diamond Tier").
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tier Label *</Label>
            <Input
              required
              maxLength={60}
              placeholder="e.g. Gold Sponsor"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-background text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Spend Threshold (IDR) *</Label>
            <Input
              required
              type="number"
              placeholder="15000000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="bg-background font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Spend Threshold (USD Override)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Optional USD threshold"
              value={thresholdUsd}
              onChange={(e) => setThresholdUsd(e.target.value)}
              className="bg-background font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Accent Badge Style</Label>
              <TierAccentBadge label={label || "Preview"} accent={accent} />
            </div>
            <Select value={accent} onValueChange={(val) => setAccent(val as SponsorTierAccent)}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="Select accent color" />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="cursor-pointer font-semibold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Tier"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
