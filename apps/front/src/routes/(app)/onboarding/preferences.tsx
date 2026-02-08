import { DEFAULT_DIGEST_INTERVAL_DAYS, formatIntervalLabel } from "@daily-brain-bits/core/plans";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { useSettingsCapabilities } from "@/components/settings/settings-utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/preferences")({
	component: PreferencesPage,
});

const FALLBACK_TIMEZONES = [
	"UTC",
	"Europe/London",
	"Europe/Paris",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Australia/Sydney",
] as const;

/** Generate interval options for the select */
function generateIntervalOptions(min: number, max: number) {
	const options: { value: number; label: string }[] = [];
	const commonIntervals = [1, 2, 3, 5, 7, 10, 14, 21, 30];
	for (const days of commonIntervals) {
		if (days >= min && days <= max) {
			options.push({ value: days, label: formatIntervalLabel(days) });
		}
	}
	return options;
}

function PreferencesPage() {
	const router = useRouter();
	const { capabilities, entitlements } = useSettingsCapabilities();
	const isPro = entitlements?.planId === "pro" || capabilities?.isPro || false;
	const minIntervalDays = entitlements?.limits.minDigestIntervalDays ?? 3;
	const maxIntervalDays = entitlements?.limits.maxDigestIntervalDays ?? 30;
	const canUseQuizzes = entitlements?.features.aiQuizzes ?? isPro;
	const maxNotesPerDigest = entitlements?.limits.maxNotesPerDigest ?? 5;
	const billingEnabled = capabilities?.billingEnabled ?? true;
	const timezoneOptions = useMemo(() => {
		if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
			const supported = (Intl as any).supportedValuesOf("timeZone");
			if (supported.length) {
				return supported;
			}
		}
		return FALLBACK_TIMEZONES;
	}, []);
	const [timezone, setTimezone] = useState(() => {
		const guessed = typeof Intl !== "undefined" ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? FALLBACK_TIMEZONES[0]) : FALLBACK_TIMEZONES[0];
		return timezoneOptions.includes(guessed) ? guessed : timezoneOptions[0];
	});
	const [preferredSendHour, setPreferredSendHour] = useState(8);
	const [digestIntervalDays, setDigestIntervalDays] = useState(() => Math.max(minIntervalDays, DEFAULT_DIGEST_INTERVAL_DAYS));
	const [notesPerDigest, setNotesPerDigest] = useState(5);
	const [quizEnabled, setQuizEnabled] = useState(false);
	const updateMutation = useMutation(orpc.settings.update.mutationOptions());
	const canProceed = useMemo(
		() =>
			isOnboardingStepComplete("preferences", {
				timezone,
				preferredSendHour,
			}),
		[preferredSendHour, timezone],
	);

	const intervalOptions = generateIntervalOptions(minIntervalDays, maxIntervalDays);

	return (
		<OnboardingLayout>
			<div className="space-y-6">
			<div className="space-y-3">
				<h1 className="font-display text-3xl text-primary">When should we send your notes?</h1>
				<p className="text-sm text-muted-foreground">Pick a time that fits your routine. Morning works best for most people.</p>
			</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-foreground">Timezone</p>
						<p className="text-sm text-muted-foreground">We'll use this to schedule your emails.</p>
						<Select value={timezone} onValueChange={setTimezone}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{timezoneOptions.map((option: string) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-foreground">Send time</p>
						<p className="text-sm text-muted-foreground">Pick the hour you want your digest to arrive.</p>
						<Select value={String(preferredSendHour)} onValueChange={(value) => setPreferredSendHour(Number(value))}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 24 }, (_, hour) => {
									const label = new Date(0, 0, 0, hour).toLocaleTimeString(undefined, {
										hour: "numeric",
										minute: "2-digit",
									});
									return (
										<SelectItem key={hour} value={String(hour)}>
											{label}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>

			<div className="space-y-2">
				<p className="font-ui text-base font-semibold tracking-[0.05em] text-foreground">Frequency</p>
				<p className="text-sm text-muted-foreground">
					{billingEnabled && !isPro
						? "Free plan: every 3-30 days. Upgrade to Pro for daily delivery."
						: "How often should we send your digest?"}
				</p>
				<Select value={String(digestIntervalDays)} onValueChange={(value) => setDigestIntervalDays(Number(value))}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{intervalOptions.map((option) => (
							<SelectItem key={option.value} value={String(option.value)}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<p className="font-ui text-base font-semibold tracking-[0.05em] text-foreground">Notes per digest</p>
				<p className="text-sm text-muted-foreground">More notes per email = faster review of your backlog.</p>
						<div className="flex items-center gap-3">
							<input
								type="number"
								name="notes-per-digest"
								min={1}
								max={maxNotesPerDigest}
								inputMode="numeric"
								className="w-24 rounded border bg-background px-2 py-1 text-right"
								value={notesPerDigest}
								disabled={!isPro}
								onChange={(event) => {
									const nextValue = Number(event.target.value);
									if (Number.isNaN(nextValue)) {
										setNotesPerDigest(5);
										return;
									}
									setNotesPerDigest(Math.min(maxNotesPerDigest, Math.max(1, nextValue)));
								}}
							/>
							{billingEnabled && !isPro ? <span className="text-xs text-muted-foreground">Pro only</span> : null}
						</div>
					</div>

			<div className="space-y-2">
				<p className="font-ui text-base font-semibold tracking-[0.05em] text-foreground">AI quizzes</p>
				<p className="text-sm text-muted-foreground">Active recall beats passive reading. Quizzes help you remember 2x more.</p>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="quiz-enabled"
								checked={quizEnabled}
								disabled={!canUseQuizzes}
								onChange={(event) => setQuizEnabled(event.target.checked)}
							/>
							<span>{quizEnabled ? "On" : "Off"}</span>
							{billingEnabled && !canUseQuizzes ? <span className="text-xs text-muted-foreground">Pro only</span> : null}
						</label>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<Button type="button" variant="ghost" onClick={() => router.navigate({ to: "/onboarding/onboarding-final" })}>
						← Back
					</Button>
					<Button
						type="button"
						disabled={!canProceed || updateMutation.isPending}
						onClick={async () => {
							if (!canProceed || updateMutation.isPending) {
								return;
							}
							await updateMutation.mutateAsync({
								digestIntervalDays: Math.max(minIntervalDays, Math.min(digestIntervalDays, maxIntervalDays)),
								notesPerDigest: isPro ? notesPerDigest : 5,
								quizEnabled: canUseQuizzes ? quizEnabled : false,
								timezone,
								preferredSendHour,
							});
							router.navigate({ to: "/onboarding/onboarding-final" });
						}}
					>
						{updateMutation.isPending ? "Saving…" : "Save & continue"}
						<span aria-hidden="true">→</span>
					</Button>
				</div>
				<div className="flex justify-end">
					<Button type="button" variant="link" className="h-auto p-0" onClick={() => router.navigate({ to: "/onboarding/onboarding-final" })}>
						Skip for now
					</Button>
				</div>
			</div>
		</OnboardingLayout>
	);
}
