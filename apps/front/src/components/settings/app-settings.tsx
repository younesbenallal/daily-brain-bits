import { formatIntervalLabel } from "@daily-brain-bits/core/plans";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";
import { useSettingsCapabilities } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

/** Generate interval options for the select */
function generateIntervalOptions(min: number, max: number) {
	const options: { value: number; label: string }[] = [];
	// Common intervals
	const commonIntervals = [1, 2, 3, 5, 7, 10, 14, 21, 30];
	for (const days of commonIntervals) {
		if (days >= min && days <= max) {
			options.push({ value: days, label: formatIntervalLabel(days) });
		}
	}
	return options;
}

export function AppSettings() {
	const queryClient = useQueryClient();
	const settingsQueryOptions = orpc.settings.get.queryOptions();
	const settingsQuery = useQuery(settingsQueryOptions);
	const settingsData = settingsQuery.data?.settings;
	const { entitlements, capabilities } = useSettingsCapabilities();
	const isPro = entitlements?.planId === "pro" || capabilities?.isPro || false;
	const minIntervalDays = entitlements?.limits.minDigestIntervalDays ?? 3;
	const maxIntervalDays = entitlements?.limits.maxDigestIntervalDays ?? 30;
	const canUseQuizzes = entitlements?.features.aiQuizzes ?? isPro;
	const canChangeNotesPerDigest = isPro;
	const maxNotesPerDigest = entitlements?.limits.maxNotesPerDigest ?? 5;
	const billingEnabled = capabilities?.billingEnabled ?? true;

	const [digestIntervalDays, setDigestIntervalDays] = useState(7);
	const [notesPerDigest, setNotesPerDigest] = useState(5);
	const [quizEnabled, setQuizEnabled] = useState(false);
	const [upgradeStatus, setUpgradeStatus] = useState<StatusMessageState>(null);

	// Clamp interval to allowed range when settings or entitlements change
	useEffect(() => {
		if (!settingsData) return;

		const clampedInterval = Math.max(minIntervalDays, Math.min(settingsData.digestIntervalDays, maxIntervalDays));
		const nextQuizEnabled = canUseQuizzes ? settingsData.quizEnabled : false;
		setDigestIntervalDays(clampedInterval);
		setNotesPerDigest(settingsData.notesPerDigest);
		setQuizEnabled(nextQuizEnabled);
	}, [settingsData, minIntervalDays, maxIntervalDays, canUseQuizzes]);

	const updateMutation = useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
			},
		}),
	);

	const upgradeMutation = useMutation({
		mutationFn: async () => authClient.checkout({ slug: "pro" }),
		onError: (error) => {
			setUpgradeStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Unable to start checkout.",
			});
		},
	});

	const baselineInterval = settingsData ? Math.max(minIntervalDays, Math.min(settingsData.digestIntervalDays, maxIntervalDays)) : digestIntervalDays;
	const baselineQuizEnabled = settingsData ? (canUseQuizzes ? settingsData.quizEnabled : false) : quizEnabled;
	const isDirty = Boolean(
		settingsData && (digestIntervalDays !== baselineInterval || notesPerDigest !== settingsData.notesPerDigest || quizEnabled !== baselineQuizEnabled),
	);
	const isBusy = settingsQuery.isLoading || updateMutation.isPending;
	const wasIntervalClamped = Boolean(settingsData && settingsData.digestIntervalDays < minIntervalDays);

	const intervalOptions = generateIntervalOptions(minIntervalDays, maxIntervalDays);

	return (
		<div className="space-y-6">
			{billingEnabled && !isPro ? (
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">Go Pro: daily digests, AI-powered quizzes, and connect unlimited sources.</p>
							<p className="text-xs text-primary/80">Review your notes 7x faster with daily delivery. Cancel anytime.</p>
						</div>
						<button
							type="button"
							className={cn(
								"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
								upgradeMutation.isPending && "opacity-60",
							)}
							disabled={upgradeMutation.isPending}
							onClick={() => {
								setUpgradeStatus(null);
								upgradeMutation.mutate();
							}}
						>
							Upgrade to Pro
						</button>
					</div>
					<StatusMessage status={upgradeStatus} />
				</div>
			) : null}

			<div className="space-y-4">
				<div className="grid gap-8">
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg ">
						<div>
							<div className="font-medium">Digest Frequency</div>
							<div className="text-sm text-muted-foreground">How often should we send you digest emails?</div>
							{wasIntervalClamped ? (
								<p className="mt-1 text-xs text-muted-foreground">
									Daily/every 2 days is Pro-only. We adjusted to {formatIntervalLabel(minIntervalDays).toLowerCase()}.
								</p>
							) : null}
							{!isPro && minIntervalDays > 1 ? (
								<p className="mt-1 text-xs text-muted-foreground">Upgrade to Pro for daily or every 2 days delivery.</p>
							) : null}
						</div>
						<select
							name="digest-interval"
							className="rounded border bg-background px-2 py-1"
							value={digestIntervalDays}
							disabled={isBusy}
							onChange={(event) => setDigestIntervalDays(Number(event.target.value))}
						>
							{intervalOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg ">
						<div>
							<div className="font-medium">Notes per digest</div>
							<div className="text-sm text-muted-foreground">How many notes should we include in each email?</div>
							{!canChangeNotesPerDigest ? (
								<p className="mt-1 text-xs text-muted-foreground">Customizable notes per digest is available on Pro.</p>
							) : null}
						</div>
						<input
							type="number"
							name="notes-per-digest"
							min={1}
							max={maxNotesPerDigest}
							inputMode="numeric"
							className="w-20 rounded border bg-background px-2 py-1 text-right"
							value={notesPerDigest}
							disabled={isBusy || !canChangeNotesPerDigest}
							onChange={(event) => {
								const nextValue = Number(event.target.value);
								if (Number.isNaN(nextValue)) {
									setNotesPerDigest(1);
									return;
								}
								setNotesPerDigest(Math.min(maxNotesPerDigest, Math.max(1, nextValue)));
							}}
						/>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg ">
						<div>
							<div className="font-medium">Generate quizzes</div>
							<div className="text-sm text-muted-foreground">Create AI-powered quizzes alongside your notes.</div>
							{!canUseQuizzes ? <p className="mt-1 text-xs text-muted-foreground">AI quizzes are available on Pro.</p> : null}
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="quiz-enabled"
								checked={quizEnabled}
								disabled={isBusy || !canUseQuizzes}
								onChange={(event) => setQuizEnabled(event.target.checked)}
							/>
							<span>{quizEnabled ? "On" : "Off"}</span>
						</label>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-3">
				{settingsQuery.isLoading ? <span className="text-sm text-muted-foreground">Loading settings…</span> : null}
				<button
					type="button"
					className={cn(
						"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
						(!isDirty || isBusy) && "opacity-60",
					)}
					disabled={!isDirty || isBusy}
					onClick={() => {
						updateMutation.mutate({
							digestIntervalDays,
							notesPerDigest,
							quizEnabled: canUseQuizzes ? quizEnabled : false,
							timezone: settingsData?.timezone ?? "UTC",
							preferredSendHour: settingsData?.preferredSendHour ?? 8,
						});
					}}
				>
					Save changes
				</button>
			</div>
		</div>
	);
}
