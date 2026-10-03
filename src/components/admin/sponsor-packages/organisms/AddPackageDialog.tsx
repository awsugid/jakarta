import { useRef, useState, type FormEvent } from "react";
import { Plus, Loader2, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { SponsorPackageGroup } from "@/lib/types";
import { uploadSponsorMockup } from "@/lib/api";
import { PLACEMENT_PRESETS } from "../types";
import { SponsorPlacementThumbnail } from "../atoms/SponsorPlacementThumbnail";
import {
  DEFAULT_PLACEMENT_IMAGE,
  COMMUNITY_DAY_EVENT_SLUG,
} from "@/components/sponsor/communityDayConfig";

interface AddPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: SponsorPackageGroup[];
  defaultGroupId?: string;
  eventSlug?: string;
  onCreatePackage: (data: {
    name: string;
    advantage: string;
    groupId: string;
    priceIdr: number;
    priceUsd?: number | null;
    imageUrl?: string;
  }) => Promise<void>;
}

export function AddPackageDialog({
  open,
  onOpenChange,
  groups,
  defaultGroupId,
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  onCreatePackage,
}: AddPackageDialogProps) {
  const [name, setName] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId || groups[0]?.id || "");
  const [price, setPrice] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Invalid file type. Allowed formats: JPEG, PNG, WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size exceeds 2MB limit.");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadSponsorMockup(eventSlug, file);
      setImageUrl(res.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload mockup image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Package name is required.");
      return;
    }
    if (!advantage.trim()) {
      setError("Benefit description is required.");
      return;
    }
    const priceNum = Number(price.trim());
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0) {
      setError("Valid IDR price is required.");
      return;
    }
    if (!groupId) {
      setError("Please select a group.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await onCreatePackage({
        name: name.trim(),
        advantage: advantage.trim(),
        groupId,
        priceIdr: priceNum,
        priceUsd: priceUsd.trim() ? Number(priceUsd.trim()) : null,
        imageUrl: imageUrl.trim() || undefined,
      });
      // Reset
      setName("");
      setAdvantage("");
      setPrice("");
      setPriceUsd("");
      setImageUrl("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create package.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border sm:rounded-2xl p-6">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Sponsor Package
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a new sponsorship item for Community Day 2026.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Package Name *</Label>
            <Input
              required
              maxLength={80}
              placeholder="e.g. Stage Backdrop Sponsor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Group / Category *</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Benefit Description *</Label>
            <Textarea
              required
              rows={2}
              maxLength={500}
              placeholder="e.g. Prominent logo placement on main stage background during keynote..."
              value={advantage}
              onChange={(e) => setAdvantage(e.target.value)}
              className="bg-background text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price (IDR) *</Label>
              <Input
                required
                type="number"
                placeholder="5000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-background font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price (USD Override)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Optional override"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                className="bg-background font-mono text-sm"
              />
            </div>
          </div>

          {/* Placement Visual Quick Select */}
          <div className="space-y-2 p-3 rounded-xl border border-border/70 bg-muted/20">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-foreground">
                Placement Preview Visual
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="h-6 px-2 text-[11px] gap-1.5 cursor-pointer font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 text-primary" />
                    Upload Mockup
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <SponsorPlacementThumbnail
                url={imageUrl.trim() || DEFAULT_PLACEMENT_IMAGE}
                className="w-16 h-12 shrink-0"
              />
              <div className="flex-1 space-y-1.5">
                <Input
                  type="url"
                  placeholder="Image URL or pick preset below"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                />
                <div className="flex flex-wrap gap-1">
                  {PLACEMENT_PRESETS.slice(0, 5).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {uploadError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
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
                "Create Package"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
