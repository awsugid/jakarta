"use client";

import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Package, Layers, Award, Settings, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_DAY_EVENT_SLUG,
  getPlacementImageUrl,
} from "@/components/sponsor/communityDayConfig";
import {
  createSponsorPackage,
  createSponsorPackageGroup,
  createSponsorTier,
  deleteSponsorPackage,
  deleteSponsorPackageGroup,
  deleteSponsorTier,
  fetchSponsorPackages,
  updateAdminSponsorPackages,
  updateSponsorTiers,
  updateSponsorSettings,
} from "@/lib/api";
import type {
  SponsorPackage,
  SponsorPackageGroup,
  SponsorPackageGroupUpdate,
  SponsorPackageUpdate,
  SponsorPackagesResponse,
  SponsorTier,
  SponsorTierUpdate,
} from "@/lib/types";

import type {
  PackageDraft,
  GroupDraft,
  TierDraft,
  DeleteTarget,
} from "./types";

import { SponsorAdminStats } from "./molecules/SponsorAdminStats";
import { SponsorSaveBar } from "./molecules/SponsorSaveBar";
import { SponsorPackagesTab } from "./organisms/SponsorPackagesTab";
import { SponsorGroupsTab } from "./organisms/SponsorGroupsTab";
import { SponsorTiersTab } from "./organisms/SponsorTiersTab";
import { SponsorSettingsTab } from "./organisms/SponsorSettingsTab";
import { AddPackageDialog } from "./organisms/AddPackageDialog";
import { AddGroupDialog } from "./organisms/AddGroupDialog";
import { AddTierDialog } from "./organisms/AddTierDialog";
import { SponsorDeleteDialog } from "./organisms/SponsorDeleteDialog";

function toPackageDrafts(
  packages: SponsorPackage[],
): Record<string, PackageDraft> {
  const drafts: Record<string, PackageDraft> = {};
  for (const p of packages) {
    drafts[p.id] = {
      name: p.name,
      advantage: p.advantage,
      groupId: p.groupId ?? "",
      price: String(p.priceIdr),
      priceUsd: p.priceUsd == null ? "" : String(p.priceUsd),
      minSpend: p.minimumSpendIdr == null ? "" : String(p.minimumSpendIdr),
      maxSponsors: p.maxSponsors == null ? "" : String(p.maxSponsors),
      reservedSponsors: String(p.reservedSponsors ?? 0),
      isUnlocked: p.isUnlocked,
      imageUrl: p.imageUrl || getPlacementImageUrl(p.id),
    };
  }
  return drafts;
}

function toGroupDrafts(
  groups: SponsorPackageGroup[],
): Record<string, GroupDraft> {
  const drafts: Record<string, GroupDraft> = {};
  for (const g of groups) {
    drafts[g.id] = { label: g.label, displayOrder: g.displayOrder };
  }
  return drafts;
}

function toTierDrafts(tiers: SponsorTier[]): Record<string, TierDraft> {
  const drafts: Record<string, TierDraft> = {};
  for (const t of tiers) {
    drafts[t.id] = {
      label: t.label,
      threshold: String(t.thresholdIdr),
      thresholdUsd: t.thresholdUsd == null ? "" : String(t.thresholdUsd),
      accent: t.accent,
    };
  }
  return drafts;
}

function isPackageDirty(
  pkg: SponsorPackage,
  draft: PackageDraft | undefined,
): boolean {
  if (!draft) return false;
  const currentImg = (pkg.imageUrl || getPlacementImageUrl(pkg.id)).trim();
  return (
    draft.name.trim() !== pkg.name.trim() ||
    draft.advantage.trim() !== pkg.advantage.trim() ||
    draft.groupId !== (pkg.groupId ?? "") ||
    draft.price.trim() !== String(pkg.priceIdr) ||
    draft.priceUsd.trim() !== (pkg.priceUsd == null ? "" : String(pkg.priceUsd)) ||
    draft.minSpend.trim() !== (pkg.minimumSpendIdr == null ? "" : String(pkg.minimumSpendIdr)) ||
    draft.maxSponsors.trim() !== (pkg.maxSponsors == null ? "" : String(pkg.maxSponsors)) ||
    draft.reservedSponsors.trim() !== String(pkg.reservedSponsors ?? 0) ||
    draft.isUnlocked !== pkg.isUnlocked ||
    draft.imageUrl.trim() !== currentImg
  );
}

function isGroupDirty(
  group: SponsorPackageGroup,
  draft: GroupDraft | undefined,
): boolean {
  if (!draft) return false;
  return draft.label !== group.label || draft.displayOrder !== group.displayOrder;
}

function isTierDirty(
  tier: SponsorTier,
  draft: TierDraft | undefined,
): boolean {
  if (!draft) return false;
  return (
    draft.label !== tier.label ||
    draft.threshold.trim() !== String(tier.thresholdIdr) ||
    draft.thresholdUsd.trim() !== (tier.thresholdUsd == null ? "" : String(tier.thresholdUsd)) ||
    draft.accent !== tier.accent
  );
}

export function SponsorPackageManager() {
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [groups, setGroups] = useState<SponsorPackageGroup[]>([]);
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(17000);

  const [drafts, setDrafts] = useState<Record<string, PackageDraft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<string, GroupDraft>>({});
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierDraft>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Settings state
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Modal dialog states
  const [activeTab, setActiveTab] = useState<"packages" | "groups" | "tiers" | "settings">("packages");
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [addPackageDefaultGroupId, setAddPackageDefaultGroupId] = useState<string | undefined>(undefined);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Drag state
  const [dragPackageId, setDragPackageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSponsorPackages(COMMUNITY_DAY_EVENT_SLUG);
      setPackages(data.packages ?? []);
      setDrafts(toPackageDrafts(data.packages ?? []));
      setGroups(data.groups ?? []);
      setGroupDrafts(toGroupDrafts(data.groups ?? []));
      setTiers(data.tiers ?? []);
      setTierDrafts(toTierDrafts(data.tiers ?? []));
      const rate = data.usdExchangeRate ?? 17000;
      setExchangeRate(rate);
      setSaveError(null);
      setConfirmDelete(null);
      setDeleteError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load sponsor packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setPackageDraft = (id: string, patch: Partial<PackageDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const setGroupDraft = (id: string, patch: Partial<GroupDraft>) => {
    setGroupDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const setTierDraft = (id: string, patch: Partial<TierDraft>) => {
    setTierDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const moveGroup = (id: string, dir: -1 | 1) => {
    const sorted = [...groups].sort(
      (a, b) => (groupDrafts[a.id]?.displayOrder ?? a.displayOrder) - (groupDrafts[b.id]?.displayOrder ?? b.displayOrder)
    );
    const idx = sorted.findIndex((g) => g.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[target];
    setGroupDrafts((prev) => ({
      ...prev,
      [a.id]: { ...prev[a.id], displayOrder: prev[b.id].displayOrder },
      [b.id]: { ...prev[b.id], displayOrder: prev[a.id].displayOrder },
    }));
  };

  const handleReset = () => {
    setDrafts(toPackageDrafts(packages));
    setGroupDrafts(toGroupDrafts(groups));
    setTierDrafts(toTierDrafts(tiers));
    setSaveError(null);
  };

  const handleSaveSettingsRate = async (newRate: number) => {
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    try {
      const refreshed = await updateSponsorSettings(COMMUNITY_DAY_EVENT_SLUG, {
        usdExchangeRate: newRate,
      });
      const updated = refreshed.usdExchangeRate ?? newRate;
      setExchangeRate(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message ?? "Failed to update exchange rate.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Check dirty state
  const dirtyIds = packages.filter((p) => isPackageDirty(p, drafts[p.id])).map((p) => p.id);
  const dirtyGroupIds = groups.filter((g) => isGroupDirty(g, groupDrafts[g.id])).map((g) => g.id);
  const dirtyTierIds = tiers.filter((t) => isTierDirty(t, tierDrafts[t.id])).map((t) => t.id);
  const dirty = dirtyIds.length > 0 || dirtyGroupIds.length > 0 || dirtyTierIds.length > 0;

  const modifiedParts = [
    dirtyGroupIds.length > 0 ? `${dirtyGroupIds.length} group${dirtyGroupIds.length === 1 ? "" : "s"}` : null,
    dirtyIds.length > 0 ? `${dirtyIds.length} package${dirtyIds.length === 1 ? "" : "s"}` : null,
    dirtyTierIds.length > 0 ? `${dirtyTierIds.length} tier${dirtyTierIds.length === 1 ? "" : "s"}` : null,
  ].filter((p): p is string => p !== null);

  // Check validation
  const anyInvalid =
    packages.some((p) => {
      const d = drafts[p.id];
      if (!d) return false;
      const priceNum = Number(d.price);
      const maxSponsors = d.maxSponsors.trim() ? Number(d.maxSponsors) : null;
      const reserved = Number(d.reservedSponsors) || 0;
      return (
        !d.name.trim() ||
        !d.advantage.trim() ||
        !d.price.trim() ||
        isNaN(priceNum) ||
        priceNum <= 0 ||
        (maxSponsors !== null && reserved > maxSponsors)
      );
    }) ||
    groups.some((g) => !groupDrafts[g.id]?.label.trim()) ||
    tiers.some((t) => {
      const td = tierDrafts[t.id];
      if (!td) return false;
      const thresh = Number(td.threshold);
      return !td.label.trim() || !td.threshold.trim() || isNaN(thresh) || thresh <= 0;
    });

  const handleBatchSave = async () => {
    if (!dirty || anyInvalid || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Save packages & groups if modified
      if (dirtyIds.length > 0 || dirtyGroupIds.length > 0) {
        const pkgUpdates: SponsorPackageUpdate[] = packages.map((p) => {
          const d = drafts[p.id]!;
          return {
            id: p.id,
            name: d.name.trim(),
            advantage: d.advantage.trim(),
            groupId: d.groupId,
            priceIdr: Number(d.price),
            priceUsd: d.priceUsd.trim() ? Number(d.priceUsd) : null,
            minimumSpendIdr: d.minSpend.trim() ? Number(d.minSpend) : null,
            maxSponsors: d.maxSponsors.trim() ? Number(d.maxSponsors) : null,
            reservedSponsors: Number(d.reservedSponsors) || 0,
            isUnlocked: d.isUnlocked,
            imageUrl: d.imageUrl.trim() || null,
          };
        });

        const groupUpdates: SponsorPackageGroupUpdate[] = groups.map((g) => ({
          id: g.id,
          label: groupDrafts[g.id]?.label.trim() || g.label,
          displayOrder: groupDrafts[g.id]?.displayOrder ?? g.displayOrder,
        }));

        await updateAdminSponsorPackages(COMMUNITY_DAY_EVENT_SLUG, {
          groups: groupUpdates,
          packages: pkgUpdates,
        });
      }

      // 2. Save tiers if modified
      if (dirtyTierIds.length > 0) {
        const tierUpdates: SponsorTierUpdate[] = tiers.map((t) => {
          const td = tierDrafts[t.id]!;
          return {
            id: t.id,
            label: td.label.trim(),
            thresholdIdr: Number(td.threshold),
            thresholdUsd: td.thresholdUsd.trim() ? Number(td.thresholdUsd) : null,
            accent: td.accent,
          };
        });

        await updateSponsorTiers(COMMUNITY_DAY_EVENT_SLUG, {
          tiers: tierUpdates,
        });
      }

      await load();
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePackage = async (data: {
    name: string;
    advantage: string;
    groupId: string;
    priceIdr: number;
    priceUsd?: number | null;
    imageUrl?: string;
  }) => {
    const refreshed = await createSponsorPackage(COMMUNITY_DAY_EVENT_SLUG, {
      name: data.name,
      advantage: data.advantage,
      groupId: data.groupId,
      priceIdr: data.priceIdr,
      priceUsd: data.priceUsd,
      imageUrl: data.imageUrl,
    });
    applyData(refreshed);
  };

  const handleCreateGroup = async (label: string) => {
    const refreshed = await createSponsorPackageGroup(COMMUNITY_DAY_EVENT_SLUG, {
      label,
    });
    applyData(refreshed);
  };

  const handleCreateTier = async (data: {
    label: string;
    thresholdIdr: number;
    thresholdUsd?: number | null;
    accent: any;
  }) => {
    const refreshed = await createSponsorTier(COMMUNITY_DAY_EVENT_SLUG, data);
    applyData(refreshed);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete || deletingItem) return;
    setDeletingItem(true);
    setDeleteError(null);
    try {
      const data =
        confirmDelete.kind === "package"
          ? await deleteSponsorPackage(COMMUNITY_DAY_EVENT_SLUG, confirmDelete.id)
          : confirmDelete.kind === "group"
          ? await deleteSponsorPackageGroup(COMMUNITY_DAY_EVENT_SLUG, confirmDelete.id)
          : await deleteSponsorTier(COMMUNITY_DAY_EVENT_SLUG, confirmDelete.id);
      applyData(data);
      setConfirmDelete(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeletingItem(false);
    }
  };

  function applyData(data: SponsorPackagesResponse) {
    setPackages(data.packages ?? []);
    setGroups(data.groups ?? []);
    setTiers(data.tiers ?? []);
    setDrafts(toPackageDrafts(data.packages ?? []));
    setGroupDrafts(toGroupDrafts(data.groups ?? []));
    setTierDrafts(toTierDrafts(data.tiers ?? []));
  }

  // Drag handlers
  const handleDragStart = (id: string, e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDragPackageId(id);
  };

  const handleDragEnd = () => {
    setDragPackageId(null);
  };

  const handleDropOnGroup = (targetGroupId: string) => {
    if (!dragPackageId) return;
    setPackageDraft(dragPackageId, { groupId: targetGroupId });
    setDragPackageId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Loading sponsor packages & pricing...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3 max-w-xl mx-auto">
        <p className="text-sm text-destructive font-semibold">{error}</p>
        <Button onClick={load} variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Overview Stat Cards */}
      <SponsorAdminStats
        packages={packages}
        groups={groups}
        tiers={tiers}
        exchangeRate={exchangeRate}
      />

      {/* Main Tabs Navigation */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto p-1 bg-card border border-border/80 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className={cn(
              "cursor-pointer text-xs font-semibold py-2 px-3 gap-1.5 rounded-xl flex items-center justify-center transition-all",
              activeTab === "packages"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Package className="h-3.5 w-3.5" />
            Packages ({packages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={cn(
              "cursor-pointer text-xs font-semibold py-2 px-3 gap-1.5 rounded-xl flex items-center justify-center transition-all",
              activeTab === "groups"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Groups ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tiers")}
            className={cn(
              "cursor-pointer text-xs font-semibold py-2 px-3 gap-1.5 rounded-xl flex items-center justify-center transition-all",
              activeTab === "tiers"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Award className="h-3.5 w-3.5" />
            Tiers ({tiers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={cn(
              "cursor-pointer text-xs font-semibold py-2 px-3 gap-1.5 rounded-xl flex items-center justify-center transition-all",
              activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            FX Settings
          </button>
        </div>

        {activeTab === "packages" && (
          <div className="space-y-4">
            <SponsorPackagesTab
              packages={packages}
              groups={groups}
              drafts={drafts}
              dirtyIds={dirtyIds}
              exchangeRate={exchangeRate}
              onUpdateDraft={setPackageDraft}
              onOpenAddPackage={(groupId) => {
                setAddPackageDefaultGroupId(groupId);
                setShowAddPackage(true);
              }}
              onOpenDelete={(id, name) => setConfirmDelete({ kind: "package", id, name })}
              deleteBlocked={dirty || saving || deletingItem}
              dragDisabled={saving || deletingItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDropOnGroup={handleDropOnGroup}
            />
          </div>
        )}

        {activeTab === "groups" && (
          <div className="space-y-4">
            <SponsorGroupsTab
              groups={groups}
              packages={packages}
              drafts={groupDrafts}
              dirtyGroupIds={dirtyGroupIds}
              onUpdateDraft={setGroupDraft}
              onMoveGroup={moveGroup}
              onOpenAddGroup={() => setShowAddGroup(true)}
              onOpenDeleteGroup={(id, name) => setConfirmDelete({ kind: "group", id, name })}
              deleteBlocked={dirty || saving || deletingItem}
            />
          </div>
        )}

        {activeTab === "tiers" && (
          <div className="space-y-4">
            <SponsorTiersTab
              tiers={tiers}
              drafts={tierDrafts}
              dirtyTierIds={dirtyTierIds}
              exchangeRate={exchangeRate}
              onUpdateDraft={setTierDraft}
              onOpenAddTier={() => setShowAddTier(true)}
              onOpenDeleteTier={(id, name) => setConfirmDelete({ kind: "tier", id, name })}
              deleteBlocked={dirty || saving || deletingItem}
            />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <SponsorSettingsTab
              exchangeRate={exchangeRate}
              onSaveRate={handleSaveSettingsRate}
              saving={savingSettings}
              error={settingsError}
              success={settingsSuccess}
            />
          </div>
        )}
      </div>

      {/* Sticky Save Bar */}
      <SponsorSaveBar
        dirty={dirty}
        saving={saving}
        modifiedParts={modifiedParts}
        anyInvalid={anyInvalid}
        saveError={saveError}
        onSave={handleBatchSave}
        onReset={handleReset}
      />

      {/* Add Package Dialog */}
      <AddPackageDialog
        open={showAddPackage}
        onOpenChange={setShowAddPackage}
        groups={groups}
        defaultGroupId={addPackageDefaultGroupId}
        onCreatePackage={handleCreatePackage}
      />

      {/* Add Group Dialog */}
      <AddGroupDialog
        open={showAddGroup}
        onOpenChange={setShowAddGroup}
        existingLabels={groups.map((g) => g.label)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Add Tier Dialog */}
      <AddTierDialog
        open={showAddTier}
        onOpenChange={setShowAddTier}
        existingLabels={tiers.map((t) => t.label)}
        existingThresholds={tiers.map((t) => t.thresholdIdr)}
        onCreateTier={handleCreateTier}
      />

      {/* Delete Confirmation Dialog */}
      <SponsorDeleteDialog
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deletingItem}
        error={deleteError}
      />
    </div>
  );
}
