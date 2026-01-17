import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
	const statusQuery = useQuery({
		...orpc.onboarding.status.queryOptions(),
		refetchInterval: REFRESH_INTERVAL,
	});
	const statusData = statusQuery.data as { noteDigestReady?: boolean } | undefined;
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
		if (canProceed) {
			router.navigate({ to: "/onboarding/onboarding-final" });
		}
	}, [canProceed, router]);

	return (
		<OnboardingLayout footer={<OnboardingFooter />}>
			{step === "loading-one" ? (
				<LoadingStepOne />
			) : step === "loading-two" ? (
				<LoadingStepTwo />
			) : (
				<TutorialStep noteDigestReady={statusData?.noteDigestReady ?? false} />
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
			<h1 className="font-display text-3xl text-[#163c6b]">We are preparing your app...</h1>
			<p className="text-sm text-[#737373]">Getting your notes ready for the first sync.</p>
		</div>
	);
}

function LoadingStepTwo() {
	return (
		<div className="space-y-4 text-center">
			<h1 className="font-display text-3xl text-[#163c6b]">While we sync, here&apos;s a quick tour</h1>
			<p className="text-sm text-[#737373]">This takes a moment. You can still explore the basics.</p>
		</div>
	);
}

function TutorialStep({ noteDigestReady }: { noteDigestReady: boolean }) {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-[#2d71c4]">How to prioritize a note</h1>
				<p className="text-sm text-[#737373]">Use the priority tag to surface what matters most.</p>
			</div>

			<div className="flex justify-center">
				<div className="flex h-44 w-44 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#f8fafc] text-xs text-[#94a3b8]">
					Screenshot
				</div>
			</div>

			<p className="text-sm text-[#737373]">Prioritized notes appear more often in your note digest, helping you review them faster.</p>

			<div className="flex justify-end">
				<span className="text-sm text-[#737373]">
					{noteDigestReady ? "Finishing setup..." : "Hang tight while we prepare your first note digest."}
				</span>
			</div>
		</div>
	);
}
