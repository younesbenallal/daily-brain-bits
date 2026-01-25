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

function PreferencesPage() {
	const router = useRouter();
	const { capabilities } = useSettingsCapabilities();
	const isPro = capabilities?.isPro ?? false;
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

	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-[#2d71c4]">Gimme your preferences</h1>
					<p className="text-sm text-muted-foreground">Help us craft your experience to your wishes.</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Timezone</p>
						<p className="text-sm text-muted-foreground">We tried to guess the timezone of your area.</p>
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
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Send time</p>
						<p className="text-sm text-muted-foreground">Pick the hour you want your weekly digest to arrive.</p>
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
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Weekly digest</p>
						<p className="text-sm text-muted-foreground">Free accounts receive a weekly digest. Upgrade to choose daily delivery.</p>
					</div>

					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Notes per digest</p>
						<p className="text-sm text-muted-foreground">Select how many notes to include in each email.</p>
						<div className="flex items-center gap-3">
							<input
								type="number"
								name="notes-per-digest"
								min={1}
								max={50}
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
									setNotesPerDigest(Math.min(50, Math.max(1, nextValue)));
								}}
							/>
							{billingEnabled && !isPro ? <span className="text-xs text-muted-foreground">Pro only</span> : null}
						</div>
					</div>

					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">AI quizzes</p>
						<p className="text-sm text-muted-foreground">Enable short quizzes alongside your notes.</p>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="quiz-enabled"
								checked={quizEnabled}
								disabled={!isPro}
								onChange={(event) => setQuizEnabled(event.target.checked)}
							/>
							<span>{quizEnabled ? "On" : "Off"}</span>
							{billingEnabled && !isPro ? <span className="text-xs text-muted-foreground">Pro only</span> : null}
						</label>
					</div>
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!canProceed || updateMutation.isPending}
						onClick={async () => {
							if (!canProceed || updateMutation.isPending) {
								return;
							}
							await updateMutation.mutateAsync({
								emailFrequency: "weekly",
								notesPerDigest: isPro ? notesPerDigest : 5,
								quizEnabled: isPro ? quizEnabled : false,
								timezone,
								preferredSendHour,
							});
							router.navigate({ to: "/onboarding/choose-source" });
						}}
					>
						{updateMutation.isPending ? "Saving…" : "Next"}
						<span aria-hidden="true">→</span>
					</Button>
				</div>
			</div>
		</OnboardingLayout>
	);
}
