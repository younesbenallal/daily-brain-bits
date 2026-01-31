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
	const settingsQuery = useQuery(orpc.settings.get.queryOptions());
	const capabilitiesQuery = useQuery(orpc.settings.capabilities.queryOptions());
	const settings = settingsQuery.data?.settings;
	const capabilities = capabilitiesQuery.data?.capabilities;
	const isPro = capabilities?.entitlements?.planId === "pro" || capabilities?.isPro || false;
	const canUseDaily = capabilities?.entitlements?.features.dailyDigest ?? isPro;
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

	const effectiveFrequency = settings && !canUseDaily && settings.emailFrequency === "daily" ? "weekly" : (settings?.emailFrequency ?? "weekly");
	const timeLabel =
		settings && settings.timezone
			? `${new Date(0, 0, 0, settings.preferredSendHour).toLocaleTimeString(undefined, {
					hour: "numeric",
					minute: "2-digit",
				})} (${settings.timezone})`
			: null;
	const frequencyLabel = effectiveFrequency === "daily" ? "Daily" : effectiveFrequency === "monthly" ? "Monthly" : "Weekly";
	const frequencyCopy = frequencyLabel.toLowerCase();
	const scheduleLabel = `${frequencyLabel}${timeLabel ? ` at ${timeLabel}` : ""}`;

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
					<h1 className="font-display text-3xl text-primary">You’re all set</h1>
					<p className="text-sm text-muted-foreground">
						Your notes are connected. Your first digest arrives {frequencyCopy}
						{timeLabel ? ` at ${timeLabel}` : ""}.
					</p>
				</div>

				<div className="rounded-lg border border-border bg-muted/30 p-4">
					<p className="text-sm font-medium text-foreground">Email schedule</p>
					<p className="mt-1 text-sm text-muted-foreground">{scheduleLabel}</p>
					<p className="mt-2 text-sm text-muted-foreground">You can change this anytime in Settings.</p>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<Button
						type="button"
						disabled={completeMutation.isPending}
						onClick={async () => {
							await completeMutation.mutateAsync({});
							router.navigate({ to: "/dash" });
						}}
					>
						Go to dashboard
						<span aria-hidden="true">→</span>
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">Manage your connected sources in Settings → Integrations.</p>
			</div>
		</OnboardingLayout>
	);
}
