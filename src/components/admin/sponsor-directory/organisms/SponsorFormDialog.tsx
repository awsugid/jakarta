import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, AlertCircle, Loader2, Eye } from "lucide-react";
import type { EventSponsor } from "@/lib/types";
import { STANDARD_TIERS } from "../atoms/SponsorTierBadge";
import { SponsorLogoThumbnail } from "../atoms/SponsorLogoThumbnail";
import { formatRupiah } from "../atoms/SponsorPriceDisplay";

export interface SponsorFormData {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: string;
  priceIdr: string;
  description: string;
  isActive: boolean;
}

const DEFAULT_FORM_DATA: SponsorFormData = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  tier: "gold",
  priceIdr: "0",
  description: "",
  isActive: true,
};

interface SponsorFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sponsor: EventSponsor | null;
  onSubmit: (data: SponsorFormData) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export function SponsorFormDialog({
  isOpen,
  onOpenChange,
  sponsor,
  onSubmit,
  isSubmitting,
  error,
}: SponsorFormDialogProps) {
  const [formData, setFormData] = useState<SponsorFormData>(DEFAULT_FORM_DATA);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (sponsor) {
        setFormData({
          name: sponsor.name,
          logoUrl: sponsor.logoUrl,
          websiteUrl: sponsor.websiteUrl ?? "",
          tier: sponsor.tier,
          priceIdr: String(sponsor.priceIdr || 0),
          description: sponsor.description ?? "",
          isActive: sponsor.isActive,
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setLocalError(null);
    }
  }, [isOpen, sponsor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const name = formData.name.trim();
    if (!name) {
      setLocalError("Sponsor name is required.");
      return;
    }
    const logoUrl = formData.logoUrl.trim();
    if (!logoUrl) {
      setLocalError("Logo URL is required.");
      return;
    }
    const tier = formData.tier.trim();
    if (!tier) {
      setLocalError("Sponsorship tier is required.");
      return;
    }
    const priceNum = Number(formData.priceIdr.trim());
    if (isNaN(priceNum) || priceNum < 0) {
      setLocalError("Price / Nominal must be a valid non-negative number.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setLocalError(err?.message ?? "An error occurred while saving.");
    }
  };

  const parsedPrice = Number(formData.priceIdr);
  const displayError = localError || error;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-orange-400" />
              {sponsor ? "Edit Sponsor" : "Add Sponsor"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure sponsor branding, tier placement, nominal commitments, and live visibility.
            </DialogDescription>
          </DialogHeader>

          {displayError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Sponsor Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-form-name" className="text-xs font-semibold">
              Sponsor / Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sponsor-form-name"
              placeholder="e.g. BINUS University, AWS, Red Hat"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="text-sm"
            />
          </div>

          {/* Logo URL & Live Preview */}
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-form-logo" className="text-xs font-semibold">
              Logo Image URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sponsor-form-logo"
              placeholder="e.g. /assets/comday26/sponsors/binus.png or https://…"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              required
              className="text-sm font-mono"
            />
            {formData.logoUrl.trim() && (
              <div className="mt-2 p-3 bg-muted/30 border border-border/70 rounded-lg flex items-center gap-3">
                <SponsorLogoThumbnail
                  src={formData.logoUrl}
                  alt="Logo preview"
                  size="sm"
                  className="bg-white"
                />
                <div className="text-xs text-muted-foreground min-w-0 flex-1">
                  <p className="font-semibold text-foreground">Logo Live Preview</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {formData.logoUrl}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-form-website" className="text-xs font-semibold">
              Website URL
            </Label>
            <Input
              id="sponsor-form-website"
              placeholder="e.g. https://binus.ac.id"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Tier & Nominal in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-form-tier" className="text-xs font-semibold">
                Sponsorship Tier <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tier}
                onValueChange={(v) => setFormData({ ...formData, tier: v })}
              >
                <SelectTrigger id="sponsor-form-tier" className="text-xs">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sponsor-form-price" className="text-xs font-semibold">
                Price / Nominal (IDR)
              </Label>
              <Input
                id="sponsor-form-price"
                type="number"
                min="0"
                step="100000"
                placeholder="0"
                value={formData.priceIdr}
                onChange={(e) => setFormData({ ...formData, priceIdr: e.target.value })}
                className="text-sm font-mono"
              />
              {!isNaN(parsedPrice) && parsedPrice > 0 && (
                <p className="text-xs text-amber-400 font-semibold pt-0.5 tabular-nums">
                  {formatRupiah(parsedPrice)}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sponsor-form-desc" className="text-xs font-semibold">
              Detail / Notes
            </Label>
            <Textarea
              id="sponsor-form-desc"
              placeholder="Add details, contact notes, booth allocations, or partnership agreements…"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-xs"
            />
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="sponsor-form-active"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: Boolean(checked) })
              }
            />
            <Label
              htmlFor="sponsor-form-active"
              className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              Active (Display on public website showcase)
            </Label>
          </div>

          <DialogFooter className="border-t border-border pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium gap-1.5 text-xs"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {sponsor ? "Save Changes" : "Create Sponsor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
