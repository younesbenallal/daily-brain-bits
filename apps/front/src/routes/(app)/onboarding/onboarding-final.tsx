import { formatIntervalLabel } from "@daily-brain-bits/core/plans";
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
	const minIntervalDays = capabilities?.entitlements?.limits.minDigestIntervalDays ?? 3;
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

	const intervalDays = settings ? Math.max(minIntervalDays, settings.digestIntervalDays) : 7;
	const timeLabel = settings?.timezone
		? `${new Date(0, 0, 0, settings.preferredSendHour).toLocaleTimeString(undefined, {
				hour: "numeric",
				minute: "2-digit",
			})} (${settings.timezone})`
		: null;
	const frequencyLabel = formatIntervalLabel(intervalDays);
	const frequencyCopy = frequencyLabel.toLowerCase();
	const scheduleLabel = `${frequencyLabel}${timeLabel ? ` at ${timeLabel}` : ""}`;

	return (
		<OnboardingLayout
			footer={
				<>
					<span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
						<span className="h-2 w-2 rounded-full " />
					</span>
					<span className="text-base font-medium">Syncing done</span>
				</>
			}
		>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-primary">You're all set</h1>
					<p className="text-sm text-muted-foreground">
						Your notes are connected and your first digest is on the way. Expect it {frequencyCopy}
						{timeLabel ? ` at ${timeLabel}` : ""}.
					</p>
				</div>

				<div className="rounded-lg border border-border bg-muted/30 p-4">
					<p className="text-sm font-medium text-foreground">Email schedule</p>
					<p className="mt-1 text-sm text-muted-foreground">{scheduleLabel}</p>
					<p className="mt-2 text-sm text-muted-foreground">You can change this anytime in Settings.</p>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-3">
					<Button type="button" variant="outline" onClick={() => router.navigate({ to: "/onboarding/preferences" })}>
						Customize delivery
					</Button>
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
			</div>
		</OnboardingLayout>
	);
}
