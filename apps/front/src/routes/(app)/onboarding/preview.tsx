import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { NoteContent } from "@/components/dash/dash-note-content";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/preview")({
	component: PreviewPage,
});

function PreviewPage() {
	const router = useRouter();
	const statusQuery = useQuery({
		...orpc.onboarding.status.queryOptions(),
		refetchInterval: 5_000,
	});
	const statusData = statusQuery.data;

	const digestQuery = useQuery(orpc.digest.today.queryOptions());
	const digestData = digestQuery.data as
		| {
				digest: {
					id: number;
					scheduledFor: string | null;
					createdAt: string;
					status: "scheduled" | "sent" | "failed" | "skipped";
					items: Array<{
						id: number;
						documentId: number;
						position: number;
						title: string | null;
						content: string;
						properties: Record<string, unknown> | null;
						sourceKind: "obsidian" | "notion" | null;
						sourceName: string | null;
					}>;
				} | null;
		  }
		| undefined;
	const digest = digestData?.digest ?? null;
	const items = digest?.items ?? [];
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		setCurrentIndex(0);
	}, [digest?.id]);

	useEffect(() => {
		if (statusData && !statusData.noteDigestReady && !statusQuery.isLoading) {
			router.navigate({ to: "/onboarding/onboarding-loading" });
		}
	}, [router, statusData, statusQuery.isLoading]);

	const currentItem = items[currentIndex];
	const noteTitle = currentItem?.title?.trim() || "Untitled note";
	const canMoveBack = currentIndex > 0;
	const canMoveForward = currentIndex < items.length - 1;
	const obsidianVaultName = currentItem?.sourceKind === "obsidian" ? (currentItem?.sourceName ?? "Obsidian Vault") : null;

	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-primary">Your first digest</h1>
					<p className="text-sm text-muted-foreground">This is what lands in your inbox—handpicked notes from your vault, ready for a quick review.</p>
				</div>

				{digestQuery.isLoading ? (
					<div className="space-y-4 animate-pulse">
						<div className="h-9 w-2/3 rounded bg-muted/30" />
						<div className="h-24 rounded bg-muted/20" />
					</div>
				) : !digest || items.length === 0 ? (
					<div className="rounded-lg border border-border bg-muted/30 p-4">
						<p className="text-sm font-medium text-foreground">Still preparing your first digest…</p>
						<p className="mt-1 text-sm text-muted-foreground">We’ll show it here as soon as it’s ready.</p>
						<div className="mt-3 flex justify-end">
							<Button type="button" variant="outline" onClick={() => router.navigate({ to: "/onboarding/onboarding-loading" })}>
								Back to syncing
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-start justify-between gap-4">
							<h2 className="flex-1 font-display text-2xl font-semibold leading-[1.2] text-foreground">{noteTitle}</h2>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 rounded-full"
									disabled={!canMoveBack}
									onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 rounded-full"
									disabled={!canMoveForward}
									onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1))}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<NoteContent content={currentItem?.content ?? ""} sourceKind={currentItem?.sourceKind} vaultName={obsidianVaultName} />

						<p className="text-center text-xs text-muted-foreground">
							{currentIndex + 1} of {items.length}
						</p>
					</div>
				)}

				<div className="flex flex-wrap items-center justify-end gap-3">
					<Button type="button" variant="outline" onClick={() => router.navigate({ to: "/onboarding/preferences" })} disabled={items.length === 0}>
						Customize delivery
					</Button>
					<Button type="button" onClick={() => router.navigate({ to: "/onboarding/onboarding-final" })} disabled={items.length === 0}>
						Finish setup
						<span aria-hidden="true">→</span>
					</Button>
				</div>
			</div>
		</OnboardingLayout>
	);
}
