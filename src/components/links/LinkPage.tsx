import { useEffect, useState } from "react";
import {
	Link as LinkIconComp,
	Calendar,
	Users,
	Github,
	Linkedin,
	Twitter,
	Youtube,
	Globe,
	Mail,
	Instagram,
	MapPin,
	ExternalLink,
	RefreshCw,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicLinks } from "@/lib/api";
import type {
	LinkBackground,
	LinkButtonStyle,
	LinkIcon,
	LinkItem,
	LinkPageProfile,
} from "@/lib/types";

const ICONS: Record<LinkIcon, LucideIcon> = {
	link: LinkIconComp,
	github: Github,
	linkedin: Linkedin,
	twitter: Twitter,
	instagram: Instagram,
	youtube: Youtube,
	globe: Globe,
	mail: Mail,
	calendar: Calendar,
	"map-pin": MapPin,
	users: Users,
	"external-link": ExternalLink,
};

const BACKGROUNDS: Record<LinkBackground, string> = {
	dark: "bg-background",
	gradient: "bg-gradient-to-b from-background via-primary/10 to-background",
	mesh: "bg-[radial-gradient(circle_at_30%_20%,theme(colors.primary/0.15),transparent),radial-gradient(circle_at_70%_80%,theme(colors.primary/0.10),transparent)] bg-background",
};

const BUTTON_STYLES: Record<LinkButtonStyle, string> = {
	solid: "bg-primary text-primary-foreground hover:bg-primary/90",
	outline: "border border-border bg-card hover:bg-muted",
	soft: "bg-primary/10 text-primary hover:bg-primary/20",
};

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

 function resolveIcon(name: string | null): LucideIcon {
	if (!name) return LinkIconComp;
	const found = ICONS[name.toLowerCase() as LinkIcon];
	return found ?? LinkIconComp;
}

function resolveVariant<T extends string>(
	map: Record<T, string>,
	key: string,
	fallback: string,
): string {
	return (map as Record<string, string>)[key?.toLowerCase() ?? ""] ?? fallback;
}

type State =
	| { kind: "loading" }
	| { kind: "error" }
	| { kind: "loaded"; profile: LinkPageProfile; links: LinkItem[] };

export function LinkPage() {
	const [state, setState] = useState<State>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setState({ kind: "loading" });
			try {
				const data = await fetchPublicLinks();
				if (cancelled) return;
				setState({ kind: "loaded", profile: data.page, links: data.items ?? [] });
			} catch {
				if (!cancelled) setState({ kind: "error" });
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const backgroundClass = resolveVariant(
		BACKGROUNDS,
		state.kind === "loaded" ? state.profile.background : "",
		"bg-background",
	);

	return (
		<div
			className={cn(
				"min-h-screen flex flex-col items-center px-4 py-10 max-w-md mx-auto",
				backgroundClass,
			)}
		>
			{state.kind === "loading" && <LoadingSkeleton />}
			{state.kind === "error" && (
				<div className="flex flex-col items-center gap-4 mt-20 text-center">
					<p className="text-sm text-muted-foreground">
						Could not load links.
					</p>
					<button
						type="button"
						onClick={() => setState({ kind: "loading" })}
						className={cn(
							"inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
							"bg-primary text-primary-foreground hover:bg-primary/90",
							FOCUS_RING,
						)}
					>
						<RefreshCw className="h-4 w-4" />
						Retry
					</button>
				</div>
			)}
			{state.kind === "loaded" && (
				<LoadedView profile={state.profile} links={state.links} />
			)}
		</div>
	);
}

function LoadedView({
	profile,
	links,
}: {
	profile: LinkPageProfile;
	links: LinkItem[];
}) {
	const buttonClass = resolveVariant(
		BUTTON_STYLES,
		profile.buttonStyle,
		BUTTON_STYLES.solid,
	);

	return (
		<>
			{profile.avatarUrl ? (
				<img
					src={profile.avatarUrl}
					alt={profile.title}
					width={96}
					height={96}
					className="h-24 w-24 rounded-full object-cover"
				/>
			) : null}

			<h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-foreground">
				{profile.title}
			</h1>

			{profile.bio ? (
				<p className="text-sm text-muted-foreground text-center mt-2">
					{profile.bio}
				</p>
			) : null}

			{links.length === 0 ? (
				<p className="mt-6 text-sm text-muted-foreground">No links yet.</p>
			) : (
				<ul className="mt-6 w-full flex flex-col gap-3 list-none p-0">
					{links.map((item) => {
						const Icon = resolveIcon(item.icon);
						return (
							<li key={item.id}>
								<a
									href={item.url}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										"w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-base transition-colors",
										buttonClass,
										FOCUS_RING,
									)}
								>
									<Icon className="h-5 w-5" />
									{item.label}
								</a>
							</li>
						);
					})}
				</ul>
			)}
		</>
	);
}

function LoadingSkeleton() {
	return (
		<>
			<Skeleton className="h-24 w-24 rounded-full" />
			<Skeleton className="mt-4 h-8 w-48" />
			<Skeleton className="mt-2 h-4 w-64" />
			<div className="mt-6 w-full flex flex-col gap-3">
				{[0, 1, 2, 3].map((i) => (
					<Skeleton
						key={i}
						className="h-12 w-full rounded-xl"
					/>
				))}
			</div>
		</>
	);
}
