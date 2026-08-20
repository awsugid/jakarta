"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, RotateCcw, Save, Trash2, User } from "lucide-react";
import { AuthProvider, useAuth, writeProfileCache } from "@/components/auth/AuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getInitials } from "@/lib/utils";
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

import { urlHost, USERNAME_REGEX } from "@/lib/validation";

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
			<div className="container mx-auto max-w-2xl px-4 py-4 sm:py-8 animate-in fade-in duration-500">
				<Card className="overflow-hidden rounded-3xl border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl relative">
					{/* Gradient Accent Strip */}
					<div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
					
					<CardHeader className="border-b border-border/50 bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 p-6 sm:p-8">
						<div className="flex items-center gap-4">
							<Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border border-border/50" />
							<div className="space-y-2 flex-1">
								<Skeleton className="h-6 w-32 bg-muted/80" />
								<Skeleton className="h-4 w-48 bg-muted/60" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-6 p-6 sm:p-8">
						<div className="space-y-2">
							<Skeleton className="h-4 w-20 bg-muted/80" />
							<Skeleton className="h-11 w-full rounded-xl bg-muted/60" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-24 bg-muted/80" />
							<Skeleton className="h-11 w-full rounded-xl bg-muted/60" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16 bg-muted/80" />
							<Skeleton className="h-11 w-full rounded-xl bg-muted/60" />
						</div>
						<div className="space-y-3">
							<Skeleton className="h-4 w-12 bg-muted/80" />
							<Skeleton className="h-24 w-full rounded-2xl bg-muted/60" />
						</div>
						<Skeleton className="h-12 w-full rounded-xl bg-muted/80" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!isSignedIn || !user) {
		return (
			<div className="container mx-auto max-w-md px-4 py-8 animate-in fade-in duration-500">
				<Card className="overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-2xl relative text-center">
					{/* Gradient Accent Strip */}
					<div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
					
					{/* Dotted background overlay */}
					<div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10 -z-10 pointer-events-none" />
					
					<CardContent className="pt-10 pb-10 flex flex-col items-center gap-5">
						<div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
							<User className="h-7 w-7" />
						</div>
						<div className="space-y-2">
							<h2 className="text-2xl font-extrabold tracking-tight text-foreground">Sign In Required</h2>
							<p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
								Sign in with your Google account to create and manage your public AWS community profile.
							</p>
						</div>
						<div className="w-full max-w-[240px] pt-2">
							<GoogleSignInButton text="Sign In with Google" useDialog={false} />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (loadFailed) {
		return (
			<div className="container mx-auto max-w-md px-4 py-8 text-center animate-in fade-in duration-500">
				<Card className="overflow-hidden rounded-3xl border-destructive/30 bg-card/60 backdrop-blur-xl shadow-2xl relative">
					{/* Red accent strip */}
					<div className="h-1.5 w-full bg-destructive" />
					
					{/* Dotted background overlay */}
					<div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-5 -z-10 pointer-events-none" />

					<CardContent className="flex flex-col items-center gap-5 px-6 py-10">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-lg shadow-destructive/5">
							<User className="h-7 w-7" />
						</div>
						<div className="space-y-2">
							<h2 className="text-2xl font-extrabold tracking-tight text-foreground">Profile Unavailable</h2>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{error || "We could not load your profile. Please check your network connection and try again."}
							</p>
						</div>
						<Button 
							type="button" 
							variant="outline" 
							onClick={() => window.location.reload()}
							className="h-10 px-6 rounded-xl border-border/80 hover:bg-muted font-semibold transition-all"
						>
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
		<div className="container mx-auto max-w-2xl px-4 py-2 animate-in fade-in duration-500 delay-100 fill-mode-both">
			<Card className="overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-2xl relative">
				{/* Gradient Accent Strip */}
				<div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
				
				{/* Dotted background overlay */}
				<div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10 -z-10 pointer-events-none" />

				<CardHeader className="border-b border-border/50 bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 p-6 sm:p-8 relative z-10">
					<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
						{/* Avatar with hover badge / camera button */}
						<div className="relative group shrink-0 rounded-full p-[3px] bg-gradient-to-br from-orange-500/70 via-pink-500/40 to-purple-500/20 shadow-md transition-transform duration-300 hover:scale-105">
							<div
								onClick={() => !uploadingAvatar && !revertingAvatar && fileInputRef.current?.click()}
								className="relative flex h-20 w-20 sm:h-24 sm:w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-background bg-muted shadow-inner focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
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
								className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-background bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
								aria-label="Change photo"
							>
								<Camera className="h-3.5 w-3.5" />
							</button>
						</div>

						{/* Details & controls */}
						<div className="flex-1 space-y-2.5 text-center sm:text-left">
							<div>
								<CardTitle className="text-xl font-bold tracking-tight text-foreground">My Profile</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
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
									className="h-8 gap-1.5 text-xs font-semibold rounded-lg border-border/80 hover:bg-muted/80 cursor-pointer"
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
										className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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

							<p className="text-[11px] text-muted-foreground/80">
								JPEG, PNG, or WebP. Max 2MB.
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6 p-6 sm:p-8 relative z-10">
					<div className="space-y-2">
						<Label htmlFor="username" className="text-sm font-semibold text-foreground">Username</Label>
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
								className="pl-8 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl h-11 transition-all"
							/>
						</div>
						<p className="text-xs text-muted-foreground/80">
							3-30 lowercase characters (letters, numbers, hyphens, underscores).
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="displayName" className="text-sm font-semibold text-foreground">Display Name</Label>
						<Input
							id="displayName"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder="Your public name"
							maxLength={80}
							className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl h-11 transition-all"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="title" className="text-sm font-semibold text-foreground">Title / Role</Label>
						<Input
							id="title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Cloud Architect / Community Builder"
							maxLength={100}
							className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl h-11 transition-all"
						/>
					</div>

					<div className="space-y-3">
						<Label className="text-sm font-semibold text-foreground">Social & Contact Links</Label>
						<div className="space-y-3">
							{links.map((link, i) => (
								<div key={i} className="rounded-2xl border border-border/50 bg-background/30 p-3 sm:p-4 space-y-3 relative group/link transition-colors hover:border-border/80">
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
										<Select
											value={link.kind}
											onValueChange={(kind) => updateLink(i, { kind: kind as ProfileLinkKind })}
										>
											<SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-border/50 rounded-xl h-11 transition-all">
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
												className="min-w-0 flex-1 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl h-11 transition-all"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
												aria-label={`Remove link ${i + 1}`}
												className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-11 w-11 transition-colors cursor-pointer"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
									{link.kind === "other" && (
										<Input
											value={link.label ?? ""}
											onChange={(e) => updateLink(i, { label: e.target.value })}
											placeholder="Label (e.g. Personal Blog)"
											maxLength={32}
											className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl h-11 transition-all"
										/>
									)}
								</div>
							))}
						</div>
						{links.length < MAX_LINKS && (
							<Button
								type="button"
								variant="outline"
								onClick={() => setLinks((prev) => [...prev, { kind: "website", url: "" }])}
								className="w-full border-dashed border-border/80 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all rounded-xl h-11 cursor-pointer font-medium"
							>
								<Plus className="h-4 w-4 mr-2" /> Add Social/Website Link
							</Button>
						)}
					</div>

					<div className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-pink-500/5 p-4 relative overflow-hidden">
						<Checkbox
							id="isPublic"
							checked={isPublic}
							onCheckedChange={(checked) => setIsPublic(checked === true)}
							className="mt-0.5 border-orange-500/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary"
						/>
						<div className="space-y-1">
							<Label htmlFor="isPublic" className="cursor-pointer text-sm font-semibold text-foreground">
								Publish my profile to community pages
							</Label>
							<p className="text-xs text-muted-foreground/80 leading-relaxed">
								When checked, your display name, title/role, custom avatar, and social links can appear on community directories (such as organizers and volunteers lists).
							</p>
						</div>
					</div>

					{error && (
						<p className="text-sm font-medium text-destructive" role="alert">
							⚠️ {error}
						</p>
					)}
					{success && (
						<p className="text-sm font-medium text-green-500" role="status">
							✓ {success}
						</p>
					)}

					<Button 
						type="button" 
						onClick={handleSave} 
						disabled={saving} 
						className="h-12 w-full font-bold tracking-wide bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-95 transition-all rounded-xl gap-2 cursor-pointer"
					>
						{saving ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Save Community Profile
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
