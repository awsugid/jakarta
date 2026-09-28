"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import {
  createAdminSponsor,
  deleteAdminSponsor,
  fetchAdminSponsors,
  reorderAdminSponsors,
  updateAdminSponsor,
} from "@/lib/api";
import type {
  EventSponsor,
  EventSponsorCreate,
  EventSponsorUpdate,
} from "@/lib/types";

// Atomic Components
import { SponsorStatsOverview } from "./organisms/SponsorStatsOverview";
import { SponsorListContainer } from "./organisms/SponsorListContainer";
import {
  SponsorFormDialog,
  type SponsorFormData,
} from "./organisms/SponsorFormDialog";
import { SponsorDeleteDialog } from "./organisms/SponsorDeleteDialog";

export function SponsorDirectoryManager() {
  const [eventSlug] = useState(COMMUNITY_DAY_EVENT_SLUG);
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Form dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<EventSponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<EventSponsor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reorder state
  const [reordering, setReordering] = useState(false);

  // Fetch sponsors list
  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSponsors(eventSlug);
      setSponsors(data.sponsors ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load sponsors");
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  // Derived stats
  const stats = useMemo(() => {
    const total = sponsors.length;
    const active = sponsors.filter((s) => s.isActive).length;
    const inactive = total - active;
    const totalNominal = sponsors.reduce((acc, s) => acc + (s.priceIdr || 0), 0);
    return { total, active, inactive, totalNominal };
  }, [sponsors]);

  // Filtered sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.tier.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query));

      const matchTier =
        selectedTier === "ALL" ||
        s.tier.toLowerCase() === selectedTier.toLowerCase();

      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && s.isActive) ||
        (selectedStatus === "INACTIVE" && !s.isActive);

      return matchSearch && matchTier && matchStatus;
    });
  }, [sponsors, searchQuery, selectedTier, selectedStatus]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedTier !== "ALL" ||
    selectedStatus !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTier("ALL");
    setSelectedStatus("ALL");
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingSponsor(null);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (sponsor: EventSponsor) => {
    setEditingSponsor(sponsor);
    setFormError(null);
    setDialogOpen(true);
  };

  // Submit Create / Edit Form
  const handleSubmitForm = async (formData: SponsorFormData) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const priceNum = Number(formData.priceIdr.trim()) || 0;

      if (editingSponsor) {
        const payload: EventSponsorUpdate = {
          name: formData.name.trim(),
          logoUrl: formData.logoUrl.trim(),
          websiteUrl: formData.websiteUrl.trim() || null,
          tier: formData.tier.trim(),
          priceIdr: priceNum,
          description: formData.description.trim() || null,
          isActive: formData.isActive,
        };
        const updated = await updateAdminSponsor(eventSlug, editingSponsor.id, payload);
        setSponsors((prev) =>
          prev.map((s) => (s.id === editingSponsor.id ? updated : s))
        );
      } else {
        const payload: EventSponsorCreate = {
          name: formData.name.trim(),
          logoUrl: formData.logoUrl.trim(),
          websiteUrl: formData.websiteUrl.trim() || null,
          tier: formData.tier.trim(),
          priceIdr: priceNum,
          description: formData.description.trim() || null,
          isActive: formData.isActive,
        };
        const created = await createAdminSponsor(eventSlug, payload);
        setSponsors((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to save sponsor details.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (sponsor: EventSponsor) => {
    try {
      const updated = await updateAdminSponsor(eventSlug, sponsor.id, {
        name: sponsor.name,
        logoUrl: sponsor.logoUrl,
        websiteUrl: sponsor.websiteUrl,
        tier: sponsor.tier,
        priceIdr: sponsor.priceIdr,
        description: sponsor.description,
        isActive: !sponsor.isActive,
      });
      setSponsors((prev) =>
        prev.map((s) => (s.id === sponsor.id ? updated : s))
      );
    } catch (err: any) {
      alert(err?.message ?? "Failed to toggle status");
    }
  };

  // Delete Sponsor
  const handleDeleteSponsor = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteAdminSponsor(eventSlug, deleteTarget.id);
      setSponsors(res.sponsors ?? []);
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err?.message ?? "Failed to delete sponsor");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reorder Move Up / Down
  const handleMoveSponsor = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const reordered = [...sponsors];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderItems = reordered.map((s, idx) => ({
      id: s.id,
      displayOrder: idx + 1,
    }));

    setReordering(true);
    try {
      const res = await reorderAdminSponsors(eventSlug, orderItems);
      setSponsors(res.sponsors ?? []);
    } catch (err: any) {
      alert(err?.message ?? "Failed to update display order");
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Stats Organism */}
      <SponsorStatsOverview
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        totalNominal={stats.totalNominal}
      />

      {/* 2. List Container Organism */}
      <SponsorListContainer
        sponsors={filteredSponsors}
        totalSponsorsCount={sponsors.length}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        onRefresh={loadSponsors}
        onAddSponsor={handleOpenCreate}
        onMoveSponsor={handleMoveSponsor}
        onToggleActive={handleToggleActive}
        onEdit={handleOpenEdit}
        onDelete={(sponsor) => setDeleteTarget(sponsor)}
        reordering={reordering}
      />

      {/* 3. Add / Edit Form Modal Organism */}
      <SponsorFormDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        sponsor={editingSponsor}
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmitting}
        error={formError}
      />

      {/* 4. Delete Confirmation Modal Organism */}
      <SponsorDeleteDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        sponsorName={deleteTarget?.name}
        onConfirm={handleDeleteSponsor}
        isDeleting={isDeleting}
      />
    </div>
  );
}
