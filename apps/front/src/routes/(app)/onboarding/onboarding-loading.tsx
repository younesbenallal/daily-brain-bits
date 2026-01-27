import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

const REFRESH_INTERVAL = 5_000;
const LOADING_ONE_MS = 2_000;
const LOADING_TWO_MS = 2_000;

export const Route = createFileRoute("/(app)/onboarding/onboarding-loading")({
	component: OnboardingLoadingPage,
});

function OnboardingLoadingPage() {
	const router = useRouter();
	const [step, setStep] = useState<"loading-one" | "loading-two" | "tutorial">("loading-one");
	const { mutate: seedDigest } = useMutation(orpc.onboarding.seedDigest.mutationOptions());
	const hasTriggeredSeedDigest = useRef(false);
	const statusQuery = useQuery({
		...orpc.onboarding.status.queryOptions(),
		refetchInterval: REFRESH_INTERVAL,
	});
	const statusData = statusQuery.data;
	const canProceed =
		statusData?.noteDigestReady &&
		isOnboardingStepComplete("loading", {
			noteDigestReady: true as const,
		});

	useEffect(() => {
		if (step === "loading-one") {
			const timer = window.setTimeout(() => setStep("loading-two"), LOADING_ONE_MS);
			return () => window.clearTimeout(timer);
		}
		if (step === "loading-two") {
			const timer = window.setTimeout(() => setStep("tutorial"), LOADING_TWO_MS);
			return () => window.clearTimeout(timer);
		}
		return undefined;
	}, [step]);

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

	useEffect(() => {
		if (canProceed) {
			router.navigate({ to: "/onboarding/preview" });
		}
	}, [canProceed, router]);

	return (
		<OnboardingLayout footer={<OnboardingFooter />}>
			{step === "loading-one" ? (
				<LoadingStepOne />
			) : step === "loading-two" ? (
				<LoadingStepTwo />
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

function OnboardingFooter() {
	return (
		<>
			<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
				<span className="h-2 w-2 rounded-full bg-white" />
			</span>
			<span className="text-base font-medium">Syncing ongoing</span>
		</>
	);
}

function LoadingStepOne() {
	return (
		<div className="space-y-4">
			<h1 className="font-display text-3xl text-foreground">Building your first digest…</h1>
			<p className="text-sm text-muted-foreground">We're scanning your notes and selecting the ones most worth revisiting.</p>
		</div>
	);
}

function LoadingStepTwo() {
	return (
		<div className="space-y-4 text-center">
			<h1 className="font-display text-3xl text-foreground">Quick tip while we sync</h1>
			<p className="text-sm text-muted-foreground">This usually takes 10–30 seconds. Here's how to get the most out of your digests.</p>
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
