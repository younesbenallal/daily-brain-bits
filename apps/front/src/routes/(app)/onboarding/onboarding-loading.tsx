import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { FocusPromptsMockup } from "@/components/mockups/focus-prompts";
import { NoteSelectionMockup } from "@/components/mockups/note-selection";
import { SpacedRepetitionMockup } from "@/components/mockups/spaced-repetition";
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
			router.navigate({ to: "/onboarding/onboarding-final" });
		}
	}, [canProceed, router]);

	// Determine which UI to show based on sync status
	const syncComplete = syncStatus === "complete";
	const syncError = syncStatus === "error";

	return (
		<OnboardingLayout footer={<OnboardingFooter syncStatus={syncStatus} hasDocuments={statusData?.hasDocuments ?? false} />}>
			{syncError ? (
				<ErrorStep onTroubleshoot={() => router.navigate({ to: "/onboarding/choose-source" })} />
			) : syncComplete && !statusData?.hasDocuments ? (
				<NoDocumentsStep onTroubleshoot={() => router.navigate({ to: "/onboarding/choose-source" })} />
			) : (
				<SyncingStep />
			)}
		</OnboardingLayout>
	);
}

function OnboardingFooter({ syncStatus, hasDocuments }: { syncStatus: string; hasDocuments: boolean }) {
	const statusText =
		syncStatus === "error"
			? "Sync error"
			: syncStatus === "complete" && hasDocuments
				? "Preparing your digest..."
				: syncStatus === "complete"
					? "Sync complete"
					: "Syncing notes...";

	const isWorking = syncStatus !== "complete" || (syncStatus === "complete" && hasDocuments);

	return (
		<>
			<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
				{syncStatus === "error" ? (
					<span className="h-2 w-2 rounded-full bg-red-400" />
				) : isWorking ? (
					<Loader2Icon className="h-3 w-3 animate-spin text-white" />
				) : (
					<span className="h-2 w-2 rounded-full bg-white" />
				)}
			</span>
			<span className="text-base font-medium">{statusText}</span>
		</>
	);
}

const TUTORIAL_SLIDES = [
	{
		title: "Syncing your notes...",
		description: "We're importing your notes and preparing your first digest. This can take 1-2 minutes depending on your vault size.",
		mockup: null,
	},
	{
		title: "Smart note selection",
		description: "We pick the perfect notes for each digest using spaced repetition — a proven technique to boost long-term memory.",
		mockup: NoteSelectionMockup,
	},
	{
		title: "Never forget what you learn",
		description: "Reviewing at optimal intervals helps you remember 2x more. We handle the scheduling so you don't have to.",
		mockup: SpacedRepetitionMockup,
	},
	{
		title: "Focus on what matters",
		description: "Tell us what you're working on and we'll prioritize matching notes. You can also add a \"priority\" tag in Notion or Obsidian.",
		mockup: FocusPromptsMockup,
	},
] as const;

const SLIDE_INTERVAL_MS = 5_000;

function SyncingStep() {
	const [slideIndex, setSlideIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setSlideIndex((prev) => (prev + 1) % TUTORIAL_SLIDES.length);
		}, SLIDE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []);

	const slide = TUTORIAL_SLIDES[slideIndex] ?? TUTORIAL_SLIDES[0];
	const MockupComponent = slide.mockup;

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-primary">{slide.title}</h1>
				<p className="text-sm text-muted-foreground">{slide.description}</p>
			</div>

			<div className="flex justify-center py-4">
				{MockupComponent ? <MockupComponent /> : <Loader2Icon className="h-12 w-12 animate-spin text-primary" />}
			</div>

			{/* Slide indicators */}
			<div className="flex justify-center gap-2">
				{TUTORIAL_SLIDES.map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => setSlideIndex(i)}
						className={`h-2 w-2 rounded-full transition-colors ${i === slideIndex ? "bg-primary" : "bg-muted-foreground/30"}`}
						aria-label={`Go to slide ${i + 1}`}
					/>
				))}
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

