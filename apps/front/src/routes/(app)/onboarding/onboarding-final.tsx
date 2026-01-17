import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/onboarding-final")({
	component: OnboardingFinalPage,
});

function OnboardingFinalPage() {
	const router = useRouter();
	const completeMutation = useMutation(orpc.onboarding.complete.mutationOptions());
	const statusQuery = useQuery({
		...orpc.onboarding.status.queryOptions(),
		refetchInterval: 5_000,
	});
	const statusData = statusQuery.data as { noteDigestReady?: boolean } | undefined;
	const canProceed =
		statusData?.noteDigestReady &&
		isOnboardingStepComplete("loading", {
			noteDigestReady: true as const,
		});

	useEffect(() => {
		if (!canProceed && !statusQuery.isLoading) {
			router.navigate({ to: "/onboarding/onboarding-loading" });
		}
	}, [canProceed, router, statusQuery.isLoading]);

	return (
		<OnboardingLayout
			footer={
				<>
					<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
						<span className="h-2 w-2 rounded-full bg-white" />
					</span>
					<span className="text-base font-medium">Syncing done</span>
				</>
			}
		>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-[#2d71c4]">Everything is ready!</h1>
					<p className="text-sm text-muted-foreground">We've successfully synced your notes.</p>
				</div>

				<p className="text-sm text-muted-foreground">From now on, you will receive a daily note</p>

				<div className="flex justify-end">
					<Button
						type="button"
						onClick={async () => {
							await completeMutation.mutateAsync({});
							router.navigate({ to: "/dash" });
						}}
					>
						Check my daily review
						<span aria-hidden="true">→</span>
					</Button>
				</div>

				<p className="text-sm text-muted-foreground">
					You can also check your data policy here (syncing regularity, notes pulled, ...)
					<br />
					You can also check how we manage your data in our Privacy terms
				</p>
			</div>
		</OnboardingLayout>
	);
}
