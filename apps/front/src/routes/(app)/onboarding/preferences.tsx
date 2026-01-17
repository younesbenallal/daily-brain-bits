import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isOnboardingStepComplete, type PreferenceFrequency, preferenceFrequencyOptions } from "@/lib/onboarding/step-validation";

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
	const timezoneOptions = useMemo(() => {
		if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
			const supported = Intl.supportedValuesOf("timeZone");
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
	const [frequency, setFrequency] = useState<PreferenceFrequency>("Daily");
	const canProceed = useMemo(
		() =>
			isOnboardingStepComplete("preferences", {
				timezone,
				frequency,
			}),
		[frequency, timezone],
	);
	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-[#2d71c4]">Gimme your preferences</h1>
					<p className="text-sm text-[#a3a3a3]">Help us craft your experience to your wishes.</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Timezone</p>
						<p className="text-sm text-[#737373]">We tried to guess the timezone of your area.</p>
						<Select value={timezone} onValueChange={setTimezone}>
							<SelectTrigger>
								<SelectValue placeholder="Select timezone" />
							</SelectTrigger>
							<SelectContent>
								{timezoneOptions.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Digest frequency</p>
						<p className="text-sm text-[#737373]">
							How often should we send your note digest? Daily is a solid default, but choose what fits your rhythm.
						</p>
						<Select value={frequency} onValueChange={(value) => setFrequency(value as PreferenceFrequency)}>
							<SelectTrigger>
								<SelectValue placeholder="Select frequency" />
							</SelectTrigger>
							<SelectContent>
								{preferenceFrequencyOptions.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!canProceed}
						onClick={() => {
							router.navigate({ to: "/onboarding/choose-source" });
						}}
					>
						Next
						<span aria-hidden="true">→</span>
					</Button>
				</div>
			</div>
		</OnboardingLayout>
	);
}
