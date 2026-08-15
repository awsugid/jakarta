"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, RotateCcw, Save, Trash2, User } from "lucide-react";
import { AuthProvider, useAuth, writeProfileCache } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getMyProfile,
	updateMyProfile,
	uploadAvatar,
	revertAvatarToGoogle,
	type MyProfile,
	type ProfileLink,
	type ProfileLinkKind,
} from "@/lib/profiles-api";

const MAX_LINKS = 8;
const KIND_OPTIONS: { value: ProfileLinkKind; label: string }[] = [
	{ value: "instagram", label: "Instagram" },
	{ value: "linkedin", label: "LinkedIn" },
	{ value: "github", label: "GitHub" },
	{ value: "website", label: "Website" },
	{ value: "x", label: "X / Twitter" },
	{ value: "youtube", label: "YouTube" },
	{ value: "other", label: "Other" },
];
// Mirrors backend host rules in jakarta-backend/src/validation/url.rs.
const KIND_HOSTS: Partial<Record<ProfileLinkKind, string[]>> = {
	instagram: ["instagram.com"],
	linkedin: ["linkedin.com"],
	github: ["github.com"],
	x: ["x.com", "twitter.com"],
	youtube: ["youtube.com", "youtu.be"],
};

function urlHost(url: string): string | null {
	try {
		const host = new URL(url.trim()).hostname.toLowerCase();
		return host.replace(/^www\./, "");
	} catch {
		return null;
	}
}

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

function validateForm(
	username: string,
	displayName: string,
	title: string,
	links: ProfileLink[],
	isPublic: boolean
): string | null {
	const userHandle = username.trim().toLowerCase();
	const name = displayName.trim();
	const role = title.trim();

	if (userHandle && !USERNAME_REGEX.test(userHandle)) {
		return "Username must be 3-30 characters (lowercase letters, numbers, hyphens, underscores).";
	}
	if (isPublic && !userHandle) {
		return "Username is required to publish your profile.";
	}
	if (name.length > 80) return "Display name must be 80 characters or fewer.";
	if (role.length > 100) return "Title must be 100 characters or fewer.";
	if (isPublic && !name) return "Display name is required to publish your profile.";
	if (isPublic && !role) return "Title is required to publish your profile.";
	if (links.length > MAX_LINKS) return `Maximum ${MAX_LINKS} links allowed.`;

	const seenKinds = new Set<string>();
	const otherLabels = new Set<string>();
	for (const link of links) {
		const host = urlHost(link.url);
		if (!/^https?:\/\//i.test(link.url.trim())) {
			return "Links must use http:// or https://.";
		}
		if (!host) return "Each link needs a valid URL.";
		const expected = KIND_HOSTS[link.kind];
		if (expected && !expected.includes(host)) {
			return `${KIND_OPTIONS.find((k) => k.value === link.kind)?.label} links must be on ${expected.join(" or ")}.`;
		}
		if (link.kind === "other") {
			const label = (link.label ?? "").trim();
			if (!label) return "Other links need a label.";
			if (label.length > 32) return "Link labels must be 32 characters or fewer.";
			if (otherLabels.has(label)) return "Other link labels must be unique.";
			otherLabels.add(label);
		} else if (seenKinds.has(link.kind)) {
			return "Only one link per platform is allowed.";
		} else {
			seenKinds.add(link.kind);
		}
	}
	return null;
}

function getInitials(name?: string | null, email?: string | null): string {
	if (name?.trim()) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return parts[0].slice(0, 2).toUpperCase();
	}
	if (email?.trim()) {
		return email.trim().slice(0, 2).toUpperCase();
	}
	return "U";
}

export function ProfileEditor() {
	return (
		<AuthProvider>
			<ProfileEditorInner />
		</AuthProvider>
	);
}

function ProfileEditorInner() {
	const { user, isSignedIn } = useAuth();
	const [mounted, setMounted] = useState(false);
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [title, setTitle] = useState("");
	const [links, setLinks] = useState<ProfileLink[]>([]);
	const [isPublic, setIsPublic] = useState(false);
	const [picture, setPicture] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadFailed, setLoadFailed] = useState(false);
	const [saving, setSaving] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [revertingAvatar, setRevertingAvatar] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!mounted) return;
		if (!isSignedIn || !user) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setLoadFailed(false);
		getMyProfile()
			.then((profile: MyProfile) => {
				if (cancelled) return;
				setUsername(profile.username ?? "");
				setDisplayName(profile.displayName ?? "");
				setTitle(profile.title ?? "");
				setLinks(profile.links ?? []);
				setIsPublic(profile.isPublic);
				setPicture(profile.picture ?? null);
				writeProfileCache({
					email: profile.email,
					picture: profile.picture,
					displayName: profile.displayName,
					username: profile.username,
				});
			})
			.catch((err: Error) => {
				if (cancelled) return;
				setError(err.message);
				setLoadFailed(true);
			})
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [mounted, isSignedIn, user?.email]);

	if (!mounted || loading) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
				<Card className="overflow-hidden rounded-3xl border-border/70 bg-card/80 shadow-xl">
					<CardHeader className="border-b border-border/50 bg-linear-to-r from-primary/10 via-card to-card">
						<div className="flex items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-3 w-48" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-6 p-6">
						<Skeleton className="h-16 w-full rounded-xl" />
						<Skeleton className="h-16 w-full rounded-xl" />
						<Skeleton className="h-16 w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-2xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!isSignedIn || !user) {
		return (
			<div className="container mx-auto max-w-md px-4 py-16 text-center">
				<Card className="overflow-hidden rounded-3xl bg-card/90 border-border/70 shadow-xl">
					<CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
						<div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
							<User className="h-6 w-6" />
						</div>
						<h2 className="text-xl font-bold">Sign In Required</h2>
						<p className="text-sm text-muted-foreground">
							Sign in to manage your community profile.
						</p>
						<GoogleSignInButton text="Sign In with Google" useDialog={false} />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (loadFailed) {
		return (
			<div className="container mx-auto max-w-md px-4 py-16 text-center">
				<Card className="overflow-hidden rounded-3xl border-destructive/30 bg-card/90 shadow-xl">
					<CardContent className="flex flex-col items-center gap-4 px-6 py-8">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
							<User className="h-6 w-6" />
						</div>
						<h2 className="text-xl font-bold">Profile unavailable</h2>
						<p className="text-sm text-muted-foreground">
							{error || "We could not load your profile. Please try again before editing."}
						</p>
						<Button type="button" variant="outline" onClick={() => window.location.reload()}>
							Try Again
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const updateLink = (index: number, patch: Partial<ProfileLink>) =>
		setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		setError(null);
		setSuccess(null);

		const allowed = ["image/jpeg", "image/png", "image/webp"];
		if (!allowed.includes(file.type)) {
			setError("Invalid file type. Please select a JPEG, PNG, or WebP image.");
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			setError("File size exceeds 2MB limit.");
			return;
		}

		setUploadingAvatar(true);
		try {
			const updated = await uploadAvatar(file);
			setPicture(updated.picture ?? null);
			writeProfileCache({
				email: updated.email,
				picture: updated.picture,
				displayName: updated.displayName,
				username: updated.username,
			});
			setSuccess("Profile picture updated.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to upload avatar.");
		} finally {
			setUploadingAvatar(false);
		}
	};

	const handleResetAvatar = async () => {
		setError(null);
		setSuccess(null);
		setRevertingAvatar(true);
		try {
			const updated = await revertAvatarToGoogle();
			const newPic = updated.picture ?? user.picture ?? null;
			setPicture(newPic);
			writeProfileCache({
				email: updated.email,
				picture: newPic,
				displayName: updated.displayName,
				username: updated.username,
			});
			setSuccess("Profile picture reset to Google photo.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to reset avatar.");
		} finally {
			setRevertingAvatar(false);
		}
	};

	const handleSave = async () => {
		setError(null);
		setSuccess(null);

		// Clean out blank link inputs (e.g. user clicked "Add link" but left URL empty)
		const cleanLinks = links
			.map((l) => ({ ...l, url: l.url.trim(), label: l.label?.trim() || undefined }))
			.filter((l) => l.url.length > 0);

		const invalid = validateForm(username, displayName, title, cleanLinks, isPublic);
		if (invalid) {
			setError(invalid);
			return;
		}
		setSaving(true);
		try {
			const saved = await updateMyProfile({
				username: username.trim().toLowerCase() || null,
				displayName: displayName.trim() || null,
				title: title.trim() || null,
				links: cleanLinks,
				isPublic,
			});
			setUsername(saved.username ?? "");
			setDisplayName(saved.displayName ?? "");
			setTitle(saved.title ?? "");
			setLinks(saved.links ?? []);
			setIsPublic(saved.isPublic);
			writeProfileCache({
				email: saved.email,
				picture: saved.picture ?? picture,
				displayName: saved.displayName,
				username: saved.username,
			});
			setSuccess("Profile saved.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save profile.");
		} finally {
			setSaving(false);
		}
	};

	const isCustomAvatar = Boolean(
		picture && (
			picture.includes("avatars.awscommunity.id") ||
			(user.picture && picture !== user.picture)
		)
	);

	return (
		<div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
			<Card className="overflow-hidden rounded-3xl bg-card/90 border-border/70 shadow-2xl shadow-black/20">
				<CardHeader className="border-b border-border/50 bg-linear-to-r from-primary/10 via-card to-card p-6 sm:p-8">
					<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
						{/* Avatar with hover badge / camera button */}
						<div className="relative group shrink-0">
							<div
								onClick={() => !uploadingAvatar && !revertingAvatar && fileInputRef.current?.click()}
								className="relative flex h-20 w-20 sm:h-24 sm:w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-md transition-all group-hover:border-primary/60 group-hover:shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
								role="button"
								tabIndex={0}
								aria-label="Change profile photo"
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										fileInputRef.current?.click();
									}
								}}
							>
								{picture ? (
									<img
										src={picture}
										alt={displayName || user.name || "Avatar"}
										referrerPolicy="no-referrer"
										className="h-full w-full object-cover"
									/>
								) : (
									<span className="text-xl sm:text-2xl font-bold text-muted-foreground">
										{getInitials(displayName || user.name, user.email)}
									</span>
								)}

								{/* Hover overlay edit badge */}
								<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
									<Camera className="h-6 w-6 text-white drop-shadow" />
									<span className="mt-0.5 text-[10px] font-medium text-white/90">Edit</span>
								</div>

								{/* Uploading / reverting spinner */}
								{(uploadingAvatar || revertingAvatar) && (
									<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
										<Loader2 className="h-7 w-7 animate-spin text-primary" />
									</div>
								)}
							</div>

							{/* Floating camera badge indicator at bottom right of avatar */}
							<button
								type="button"
								onClick={() => !uploadingAvatar && !revertingAvatar && fileInputRef.current?.click()}
								disabled={uploadingAvatar || revertingAvatar}
								className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
								aria-label="Change photo"
							>
								<Camera className="h-3.5 w-3.5" />
							</button>
						</div>

						{/* Details & controls */}
						<div className="flex-1 space-y-2.5 text-center sm:text-left">
							<div>
								<CardTitle className="text-xl font-bold">My Profile</CardTitle>
								<CardDescription className="text-xs">
									Signed in as {user.email}
								</CardDescription>
							</div>

							<input
								type="file"
								ref={fileInputRef}
								accept="image/jpeg,image/png,image/webp"
								onChange={handleFileSelect}
								className="hidden"
								tabIndex={-1}
								aria-hidden="true"
							/>

							<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploadingAvatar || revertingAvatar}
									className="h-8 gap-1.5 text-xs font-medium"
								>
									{uploadingAvatar ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Camera className="h-3.5 w-3.5" />
									)}
									Change Photo
								</Button>

								{isCustomAvatar && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleResetAvatar}
										disabled={uploadingAvatar || revertingAvatar}
										className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
									>
										{revertingAvatar ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<RotateCcw className="h-3.5 w-3.5" />
										)}
										Reset to Google Photo
									</Button>
								)}
							</div>

							<p className="text-[11px] text-muted-foreground">
								JPEG, PNG, or WebP. Max 2MB.
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6 p-6 sm:p-8">
					<div className="space-y-2">
						<Label htmlFor="username">Username</Label>
						<div className="relative flex items-center">
							<span className="pointer-events-none absolute left-3 text-sm font-semibold text-muted-foreground">
								@
							</span>
							<Input
								id="username"
								value={username}
								onChange={(e) =>
									setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
								}
								placeholder="username"
								maxLength={30}
								className="pl-8"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							3-30 lowercase characters (letters, numbers, hyphens, underscores).
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="displayName">Display Name</Label>
						<Input
							id="displayName"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder="Your public name"
							maxLength={80}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. AWS User Group Leader"
							maxLength={100}
						/>
					</div>

          <div className="space-y-3">
            <Label>Links</Label>
            {links.map((link, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={link.kind}
                    onValueChange={(kind) => updateLink(i, { kind: kind as ProfileLinkKind })}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex min-w-0 flex-1 gap-2">
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(i, { url: e.target.value })}
                      placeholder="https://"
                      inputMode="url"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove link ${i + 1}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {link.kind === "other" && (
                  <Input
                    value={link.label ?? ""}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    placeholder="Label (e.g. Blog)"
                    maxLength={32}
                  />
                )}
              </div>
            ))}
            {links.length < MAX_LINKS && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinks((prev) => [...prev, { kind: "website", url: "" }])}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4" /> Add link
              </Button>
            )}
          </div>

					<div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
						<Checkbox
							id="isPublic"
							checked={isPublic}
							onCheckedChange={(checked) => setIsPublic(checked === true)}
							className="mt-0.5"
						/>
						<div className="space-y-1">
							<Label htmlFor="isPublic" className="cursor-pointer">
								Public profile
							</Label>
							<p className="text-xs text-muted-foreground">
								When public, this profile can appear on community pages that include
								your username. Username, display name, and title are required to publish.
							</p>
						</div>
					</div>

					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
					{success && (
						<p className="text-sm text-green-500" role="status">
							{success}
						</p>
					)}

					<Button type="button" onClick={handleSave} disabled={saving} className="h-11 w-full font-semibold shadow-lg shadow-primary/10">
						{saving ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Save Profile
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
