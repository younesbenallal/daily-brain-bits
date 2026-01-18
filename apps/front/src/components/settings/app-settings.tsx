import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";
import { getCustomerState, getPlanSummary } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

export function AppSettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const settingsQueryOptions = orpc.settings.get.queryOptions();
	const settingsQuery = useQuery(settingsQueryOptions);
	const settingsData = settingsQuery.data?.settings;
	const customerStateQuery = useQuery({
		queryKey: ["billing", "customer-state"],
		queryFn: () => authClient.customer.state(),
		enabled: Boolean(user),
	});
	const planSummary = getPlanSummary(getCustomerState(customerStateQuery.data));
	const isPro = planSummary.isPro;
	const frequencyOptions = useMemo(
		() =>
			[
				{ value: "daily", label: "Daily" },
				{ value: "weekly", label: "Weekly" },
				{ value: "monthly", label: "Monthly" },
			] as const,
		[],
	);
	type EmailFrequency = (typeof frequencyOptions)[number]["value"];
	const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>("daily");
	const [notesPerDigest, setNotesPerDigest] = useState(5);
	const [quizEnabled, setQuizEnabled] = useState(false);
	const [upgradeStatus, setUpgradeStatus] = useState<StatusMessageState>(null);

	useEffect(() => {
		if (!settingsData) {
			return;
		}

		const nextFrequency =
			!isPro && settingsData.emailFrequency === "daily" ? "weekly" : (settingsData.emailFrequency as EmailFrequency);
		const nextQuizEnabled = isPro ? settingsData.quizEnabled : false;
		setEmailFrequency(nextFrequency);
		setNotesPerDigest(settingsData.notesPerDigest);
		setQuizEnabled(nextQuizEnabled);
	}, [settingsData, isPro]);

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

	const baselineFrequency = settingsData
		? (!isPro && settingsData.emailFrequency === "daily" ? "weekly" : settingsData.emailFrequency)
		: emailFrequency;
	const baselineQuizEnabled = settingsData ? (isPro ? settingsData.quizEnabled : false) : quizEnabled;
	const isDirty = Boolean(
		settingsData &&
			(emailFrequency !== baselineFrequency || notesPerDigest !== settingsData.notesPerDigest || quizEnabled !== baselineQuizEnabled),
	);
	const isBusy = settingsQuery.isLoading || updateMutation.isPending;
	const forcedDailyToWeekly = Boolean(settingsData && !isPro && settingsData.emailFrequency === "daily");

	return (
		<div className="space-y-6">
			{!isPro ? (
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">Upgrade to Pro to unlock daily digests, AI quizzes, and multiple sources.</p>
							<p className="text-xs text-primary/80">Free users get weekly or monthly emails and one knowledge source.</p>
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
				<h3 className="text-lg font-medium">Preferences</h3>
				<div className="grid gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
						<div>
							<div className="font-medium">Email Frequency</div>
							<div className="text-sm text-muted-foreground">How often should we send you digest emails?</div>
							{forcedDailyToWeekly ? (
								<p className="mt-1 text-xs text-muted-foreground">Daily digests are Pro-only. We switched you to weekly.</p>
							) : null}
						</div>
					<select
						name="email-frequency"
						className="rounded border bg-background px-2 py-1"
						value={emailFrequency}
						disabled={isBusy}
						onChange={(event) => setEmailFrequency(event.target.value as EmailFrequency)}
					>
							{frequencyOptions.map((option) => {
								const isLocked = option.value === "daily" && !isPro;
								return (
									<option key={option.value} value={option.value} disabled={isLocked}>
										{option.label}
										{isLocked ? " (Pro)" : ""}
									</option>
								);
							})}
						</select>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
						<div>
							<div className="font-medium">Notes per digest</div>
							<div className="text-sm text-muted-foreground">How many notes should we include in each email?</div>
						</div>
					<input
						type="number"
						name="notes-per-digest"
						min={1}
						max={50}
						inputMode="numeric"
						className="w-20 rounded border bg-background px-2 py-1 text-right"
						value={notesPerDigest}
						disabled={isBusy}
						onChange={(event) => {
								const nextValue = Number(event.target.value);
								if (Number.isNaN(nextValue)) {
									setNotesPerDigest(1);
									return;
								}
								setNotesPerDigest(Math.min(50, Math.max(1, nextValue)));
							}}
						/>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
						<div>
							<div className="font-medium">Generate quizzes</div>
							<div className="text-sm text-muted-foreground">Create AI-powered quizzes alongside your notes.</div>
							{!isPro ? <p className="mt-1 text-xs text-muted-foreground">AI quizzes are available on Pro.</p> : null}
						</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="quiz-enabled"
							checked={quizEnabled}
							disabled={isBusy || !isPro}
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
							emailFrequency,
							notesPerDigest,
							quizEnabled: isPro ? quizEnabled : false,
						});
					}}
				>
					Save changes
				</button>
			</div>
		</div>
	);
}
