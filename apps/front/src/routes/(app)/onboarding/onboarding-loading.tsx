import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

const REFRESH_INTERVAL = 3_000;

export const Route = createFileRoute("/(app)/onboarding/onboarding-loading")({
	component: OnboardingLoadingPage,
});

function OnboardingLoadingPage() {
	const router = useRouter();
	const { mutate: seedDigest } = useMutation(orpc.onboarding.seedDigest.mutationOptions());
	const hasTriggeredSeedDigest = useRef(false);
	const statusQuery = useQuery({
		...orpc.onboarding.status.queryOptions(),
		refetchInterval: REFRESH_INTERVAL,
	});
	const statusData = statusQuery.data;
	const syncStatus = statusData?.syncStatus ?? "pending";
	const canProceed =
		statusData?.noteDigestReady &&
		isOnboardingStepComplete("loading", {
			noteDigestReady: true as const,
		});

	// Trigger seed digest when documents are available
	useEffect(() => {
		if (hasTriggeredSeedDigest.current) {
			return;
		}
		if (!statusData?.hasDocuments) {
			return;
		}
		if (statusData.noteDigestReady) {
			return;
		}

		hasTriggeredSeedDigest.current = true;
		seedDigest({}, { onError: (error) => console.error("Failed to start onboarding seed digest:", error) });
	}, [seedDigest, statusData?.hasDocuments, statusData?.noteDigestReady]);

	// Auto-navigate when ready
	useEffect(() => {
		if (canProceed) {
			router.navigate({ to: "/onboarding/preview" });
		}
	}, [canProceed, router]);

	// Determine which UI to show based on sync status
	const isSyncing = syncStatus === "pending" || syncStatus === "syncing";
	const syncComplete = syncStatus === "complete";
	const syncError = syncStatus === "error";

	return (
		<OnboardingLayout footer={<OnboardingFooter syncStatus={syncStatus} />}>
			{isSyncing ? (
				<SyncingStep />
			) : syncError ? (
				<ErrorStep onTroubleshoot={() => router.navigate({ to: "/onboarding/choose-source" })} />
			) : syncComplete && !statusData?.hasDocuments ? (
				<NoDocumentsStep onTroubleshoot={() => router.navigate({ to: "/onboarding/choose-source" })} />
			) : (
				<TutorialStep
					noteDigestReady={statusData?.noteDigestReady ?? false}
					hasDocuments={statusData?.hasDocuments ?? false}
					onTroubleshoot={() => router.navigate({ to: "/onboarding/choose-source" })}
				/>
			)}
		</OnboardingLayout>
	);
}

function OnboardingFooter({ syncStatus }: { syncStatus: string }) {
	const statusText = syncStatus === "complete" ? "Sync complete" : syncStatus === "error" ? "Sync error" : "Syncing notes...";

	return (
		<>
			<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
				{syncStatus === "complete" ? (
					<span className="h-2 w-2 rounded-full bg-white" />
				) : syncStatus === "error" ? (
					<span className="h-2 w-2 rounded-full bg-red-400" />
				) : (
					<Loader2Icon className="h-3 w-3 animate-spin text-white" />
				)}
			</span>
			<span className="text-base font-medium">{statusText}</span>
		</>
	);
}

function SyncingStep() {
	return (
		<div className="space-y-4">
			<h1 className="font-display text-3xl text-foreground">Syncing your notes...</h1>
			<p className="text-sm text-muted-foreground">We're importing your notes and preparing your first digest. This usually takes 10-30 seconds.</p>
			<div className="flex justify-center pt-4">
				<Loader2Icon className="h-8 w-8 animate-spin text-primary" />
			</div>
		</div>
	);
}

function ErrorStep({ onTroubleshoot }: { onTroubleshoot: () => void }) {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-foreground">Something went wrong</h1>
				<p className="text-sm text-muted-foreground">We encountered an error while syncing your notes. Please check your connection and try again.</p>
			</div>
			<div className="flex justify-center">
				<button type="button" className="text-sm font-medium text-primary hover:underline" onClick={onTroubleshoot}>
					Back to setup
				</button>
			</div>
		</div>
	);
}

function NoDocumentsStep({ onTroubleshoot }: { onTroubleshoot: () => void }) {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-foreground">No notes found</h1>
				<p className="text-sm text-muted-foreground">
					The sync completed but we didn't find any notes. Make sure you've selected at least one Notion database or triggered a sync from the Obsidian
					plugin.
				</p>
			</div>
			<div className="flex justify-center">
				<button type="button" className="text-sm font-medium text-primary hover:underline" onClick={onTroubleshoot}>
					Back to setup
				</button>
			</div>
		</div>
	);
}

function TutorialStep({
	noteDigestReady,
	hasDocuments,
	onTroubleshoot,
}: {
	noteDigestReady: boolean;
	hasDocuments: boolean;
	onTroubleshoot: () => void;
}) {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-primary">Prioritize what matters most</h1>
				<p className="text-sm text-muted-foreground">
					Add a "priority" tag in Notion or Obsidian to any note you want to see more often. We'll surface it sooner.
				</p>
			</div>

			<div className="flex justify-center">
				<div className="flex h-44 w-44 items-center justify-center rounded-[12px] border border-border bg-card text-xs text-muted-foreground">
					Screenshot
				</div>
			</div>

			<p className="text-sm text-muted-foreground">Prioritized notes appear more often in your note digest, helping you review them faster.</p>

			{!hasDocuments ? (
				<div className="rounded-lg border border-border bg-muted/30 p-4">
					<p className="text-sm font-medium text-foreground">Still waiting for notes…</p>
					<p className="mt-1 text-sm text-muted-foreground">
						If this takes more than a minute, go back and check your connection (or make sure you selected at least one Notion database).
					</p>
					<div className="mt-3 flex justify-end">
						<button
							type="button"
							className="text-sm font-medium text-primary hover:underline"
							onClick={onTroubleshoot}
						>
							Back to setup
						</button>
					</div>
				</div>
			) : null}

			<div className="flex justify-end">
				<span className="text-sm text-muted-foreground">
					{noteDigestReady ? "Finishing setup..." : "Hang tight while we prepare your first note digest."}
				</span>
			</div>
		</div>
	);
}
