import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/layouts/app-layout";
import { authClient, linkSocial, useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";

const settingsSearchSchema = z.object({
	tab: z.enum(["app", "account", "billing"]).default("app"),
});

function normalizeList<T>(value: unknown): T[] {
	if (Array.isArray(value)) {
		return value;
	}
	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const candidate = record.data ?? record.items ?? record.accounts ?? record.sessions ?? record.result;
		if (Array.isArray(candidate)) {
			return candidate as T[];
		}
	}
	return [];
}

export const Route = createFileRoute("/(app)/settings")({
	validateSearch: (search) => settingsSearchSchema.parse(search),
	component: SettingsPage,
});

function SettingsPage() {
	const { tab } = Route.useSearch();

	return (
		<AppLayout maxWidth="max-w-[800px]">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="font-display text-3xl font-semibold text-primary">Settings</h1>
					<p className="mt-1 text-muted-foreground">Manage your application preferences and account details.</p>
				</div>

				<div className="flex gap-1 border-b border-border pb-px">
					{["app", "account", "billing"].map((t) => (
						<Link
							key={t}
							to="/settings"
							search={{ tab: t as any }}
							className={cn(
								"relative px-4 py-2 text-sm font-medium transition-colors",
								tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
							)}
						>
							{t.charAt(0).toUpperCase() + t.slice(1)}
						</Link>
					))}
				</div>

				<div className="mt-4">
					{tab === "app" && <AppSettings />}
					{tab === "account" && <AccountSettings />}
					{tab === "billing" && <BillingSettings />}
				</div>
			</div>
		</AppLayout>
	);
}

function AppSettings() {
	const queryClient = useQueryClient();
	const settingsQueryOptions = orpc.settings.get.queryOptions();
	const settingsQuery = useQuery(settingsQueryOptions);
	const settingsData = settingsQuery.data?.settings;
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

	useEffect(() => {
		if (!settingsData) {
			return;
		}
		setEmailFrequency(settingsData.emailFrequency as EmailFrequency);
		setNotesPerDigest(settingsData.notesPerDigest);
		setQuizEnabled(settingsData.quizEnabled);
	}, [settingsData]);

	const updateMutation = useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
			},
		}),
	);

	const isDirty = Boolean(
		settingsData &&
			(emailFrequency !== settingsData.emailFrequency || notesPerDigest !== settingsData.notesPerDigest || quizEnabled !== settingsData.quizEnabled),
	);
	const isBusy = settingsQuery.isLoading || updateMutation.isPending;

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Preferences</h3>
				<div className="grid gap-4">
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="font-medium">Email Frequency</div>
							<div className="text-sm text-muted-foreground">How often should we send you digest emails?</div>
						</div>
						<select
							className="rounded border bg-background px-2 py-1"
							value={emailFrequency}
							disabled={isBusy}
							onChange={(event) => setEmailFrequency(event.target.value as EmailFrequency)}
						>
							{frequencyOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="font-medium">Notes per digest</div>
							<div className="text-sm text-muted-foreground">How many notes should we include in each email?</div>
						</div>
						<input
							type="number"
							min={1}
							max={50}
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
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="font-medium">Generate quizzes</div>
							<div className="text-sm text-muted-foreground">Create AI-powered quizzes alongside your notes.</div>
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input type="checkbox" checked={quizEnabled} disabled={isBusy} onChange={(event) => setQuizEnabled(event.target.checked)} />
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
							quizEnabled,
						});
					}}
				>
					Save changes
				</button>
			</div>
		</div>
	);
}

function AccountSettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;

	const accountsQuery = useQuery({
		queryKey: ["auth", "accounts"],
		queryFn: () => authClient.listAccounts(),
		enabled: Boolean(user),
	});
	const accounts = normalizeList(accountsQuery.data);
	const hasCredentialAccount = accounts.some((account) => account.providerId === "credential");

	const sessionsQuery = useQuery({
		queryKey: ["auth", "sessions"],
		queryFn: () => authClient.listSessions(),
		enabled: Boolean(user),
	});

	const notionStatusQueryOptions = useMemo(() => orpc.notion.status.queryOptions(), []);
	const notionStatusQuery = useQuery({ ...notionStatusQueryOptions, enabled: Boolean(user) });
	const obsidianStatusQueryOptions = useMemo(() => orpc.obsidian.status.queryOptions(), []);
	const obsidianStatusQuery = useQuery({ ...obsidianStatusQueryOptions, enabled: Boolean(user) });

	const [emailDraft, setEmailDraft] = useState("");
	const [emailStatus, setEmailStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

	const [currentPassword, setCurrentPassword] = useState("");
	const [nextPassword, setNextPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [setPasswordDraft, setSetPasswordDraft] = useState("");
	const [confirmSetPassword, setConfirmSetPassword] = useState("");
	const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
	const [passwordStatus, setPasswordStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

	const [oauthStatus, setOauthStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
	const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

	const [sessionStatus, setSessionStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

	useEffect(() => {
		setEmailDraft("");
	}, [user?.email]);

	const changeEmailMutation = useMutation({
		mutationFn: async () => {
			const trimmed = emailDraft.trim();
			if (!trimmed) {
				throw new Error("Enter a new email address.");
			}
			if (trimmed === user?.email) {
				throw new Error("This email matches your current address.");
			}
			return authClient.changeEmail({
				newEmail: trimmed,
				callbackURL: `${window.location.origin}/settings?tab=account`,
			});
		},
		onSuccess: () => {
			setEmailStatus({
				tone: "success",
				message: "Check your inbox to confirm the change.",
			});
			setEmailDraft("");
		},
		onError: (error) => {
			setEmailStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Email change failed.",
			});
		},
	});

	const resendVerificationMutation = useMutation({
		mutationFn: async () => {
			if (!user?.email) {
				throw new Error("Email not available.");
			}
			return authClient.sendVerificationEmail({
				email: user.email,
				callbackURL: `${window.location.origin}/settings?tab=account`,
			});
		},
		onSuccess: () => {
			setEmailStatus({
				tone: "success",
				message: "Verification email sent.",
			});
		},
		onError: (error) => {
			setEmailStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Verification email failed.",
			});
		},
	});

	const changePasswordMutation = useMutation({
		mutationFn: async () => {
			if (!currentPassword || !nextPassword) {
				throw new Error("Fill in your current and new password.");
			}
			if (nextPassword !== confirmPassword) {
				throw new Error("New passwords do not match.");
			}
			return authClient.changePassword({
				currentPassword,
				newPassword: nextPassword,
				revokeOtherSessions,
			});
		},
		onSuccess: () => {
			setPasswordStatus({ tone: "success", message: "Password updated." });
			setCurrentPassword("");
			setNextPassword("");
			setConfirmPassword("");
			void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
		},
		onError: (error) => {
			setPasswordStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Password update failed.",
			});
		},
	});

	const setPasswordMutation = useMutation({
		mutationFn: async () => {
			if (!setPasswordDraft) {
				throw new Error("Enter a password.");
			}
			if (setPasswordDraft !== confirmSetPassword) {
				throw new Error("Passwords do not match.");
			}
			return authClient.setPassword({
				newPassword: setPasswordDraft,
			});
		},
		onSuccess: () => {
			setPasswordStatus({ tone: "success", message: "Password created." });
			setSetPasswordDraft("");
			setConfirmSetPassword("");
			void queryClient.invalidateQueries({ queryKey: ["auth", "accounts"] });
		},
		onError: (error) => {
			setPasswordStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Password setup failed.",
			});
		},
	});

	const unlinkMutation = useMutation({
		mutationFn: async ({ providerId, accountId }: { providerId: string; accountId?: string }) => authClient.unlinkAccount({ providerId, accountId }),
		onSuccess: () => {
			setOauthStatus({ tone: "success", message: "Connection removed." });
			void queryClient.invalidateQueries({ queryKey: ["auth", "accounts"] });
		},
		onError: (error) => {
			setOauthStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Failed to disconnect provider.",
			});
		},
	});

	const revokeOtherSessionsMutation = useMutation({
		mutationFn: async () => authClient.revokeOtherSessions(),
		onSuccess: () => {
			setSessionStatus({ tone: "success", message: "Signed out of other sessions." });
			void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
		},
		onError: (error) => {
			setSessionStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Failed to revoke sessions.",
			});
		},
	});

	const oauthProviders = useMemo(
		() =>
			[
				{ id: "google", name: "Google", description: "Sign in faster with your Google account." },
				{ id: "apple", name: "Apple", description: "Keep sign in private with Apple." },
			] as const,
		[],
	);

	const accountsByProvider = useMemo(() => {
		const grouped = new Map<string, typeof accounts>();
		for (const account of accounts) {
			const existing = grouped.get(account.providerId);
			if (existing) {
				existing.push(account);
			} else {
				grouped.set(account.providerId, [account]);
			}
		}
		return grouped;
	}, [accounts]);

	const notionStatus = notionStatusQuery.data;
	const obsidianStatus = obsidianStatusQuery.data;
	const activeSessionCount = normalizeList(sessionsQuery.data).length;

	const renderStatus = (status: { tone: "success" | "error"; message: string } | null) =>
		status ? <p className={cn("text-sm", status.tone === "error" ? "text-destructive" : "text-primary")}>{status.message}</p> : null;

	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Email</h3>
				<div className="grid gap-4 rounded-lg border p-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Current email</label>
						<div className="flex items-center gap-3">
							<input className="w-full rounded-lg border bg-background px-3 py-2" value={user?.email ?? ""} disabled />
							<span
								className={cn(
									"rounded-full border px-2 py-1 text-xs",
									user?.emailVerified ? "border-primary/30 text-primary" : "border-border text-muted-foreground",
								)}
							>
								{user?.emailVerified ? "Verified" : "Unverified"}
							</span>
						</div>
					</div>
					{!user?.emailVerified ? (
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								className={cn(
									"rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent",
									resendVerificationMutation.isPending && "opacity-60",
								)}
								disabled={resendVerificationMutation.isPending}
								onClick={() => {
									setEmailStatus(null);
									resendVerificationMutation.mutate();
								}}
							>
								Resend verification
							</button>
							{renderStatus(emailStatus)}
						</div>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Change email</label>
						<div className="flex flex-wrap gap-3">
							<input
								className="min-w-[240px] flex-1 rounded-lg border bg-background px-3 py-2"
								value={emailDraft}
								placeholder="new-email@example.com"
								disabled={!user}
								onChange={(event) => setEmailDraft(event.target.value)}
							/>
							<button
								type="button"
								className={cn(
									"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
									(!emailDraft.trim() || changeEmailMutation.isPending) && "opacity-60",
								)}
								disabled={!emailDraft.trim() || changeEmailMutation.isPending}
								onClick={() => {
									setEmailStatus(null);
									changeEmailMutation.mutate();
								}}
							>
								Request change
							</button>
						</div>
						<p className="text-xs text-muted-foreground">We will send a verification link before updating your address.</p>
					</div>
					{renderStatus(emailStatus)}
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Password & Security</h3>
				<div className="grid gap-4 rounded-lg border p-4">
					{hasCredentialAccount ? (
						<>
							<div className="space-y-2">
								<label className="text-sm font-medium">Current password</label>
								<input
									type="password"
									className="w-full rounded-lg border bg-background px-3 py-2"
									value={currentPassword}
									onChange={(event) => setCurrentPassword(event.target.value)}
								/>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium">New password</label>
									<input
										type="password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={nextPassword}
										onChange={(event) => setNextPassword(event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">Confirm new password</label>
									<input
										type="password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
									/>
								</div>
							</div>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={revokeOtherSessions} onChange={(event) => setRevokeOtherSessions(event.target.checked)} />
								Sign out of other sessions
							</label>
							<div className="flex flex-wrap items-center gap-3">
								<button
									type="button"
									className={cn(
										"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
										(changePasswordMutation.isPending || !currentPassword || !nextPassword) && "opacity-60",
									)}
									disabled={changePasswordMutation.isPending || !currentPassword || !nextPassword}
									onClick={() => {
										setPasswordStatus(null);
										changePasswordMutation.mutate();
									}}
								>
									Update password
								</button>
								{renderStatus(passwordStatus)}
							</div>
						</>
					) : (
						<>
							<p className="text-sm text-muted-foreground">You signed up with a social provider. Add a password to enable email/password sign in.</p>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium">New password</label>
									<input
										type="password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={setPasswordDraft}
										onChange={(event) => setSetPasswordDraft(event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">Confirm new password</label>
									<input
										type="password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={confirmSetPassword}
										onChange={(event) => setConfirmSetPassword(event.target.value)}
									/>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<button
									type="button"
									className={cn(
										"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
										(!setPasswordDraft || setPasswordMutation.isPending) && "opacity-60",
									)}
									disabled={!setPasswordDraft || setPasswordMutation.isPending}
									onClick={() => {
										setPasswordStatus(null);
										setPasswordMutation.mutate();
									}}
								>
									Set password
								</button>
								{renderStatus(passwordStatus)}
							</div>
						</>
					)}
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">OAuth Connections</h3>
				<p className="text-sm text-muted-foreground">Connect or remove sign-in providers for faster access.</p>
				<div className="divide-y rounded-lg border">
					{oauthProviders.map((provider) => {
						const connectedAccounts = accountsByProvider.get(provider.id) ?? [];
						const isConnected = connectedAccounts.length > 0;
						const accountId = connectedAccounts[0]?.accountId;
						return (
							<div key={provider.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded bg-muted font-semibold uppercase">{provider.name.slice(0, 1)}</div>
									<div>
										<div className="font-medium">{provider.name}</div>
										<div className="text-xs text-muted-foreground">{provider.description}</div>
										<div className={cn("text-xs font-medium", isConnected ? "text-primary" : "text-muted-foreground")}>
											{isConnected ? "Connected" : "Not connected"}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									{isConnected ? (
										<button
											type="button"
											className={cn(
												"rounded-lg border px-4 py-2 text-sm font-medium text-destructive hover:bg-accent",
												unlinkMutation.isPending && "opacity-60",
											)}
											disabled={unlinkMutation.isPending}
											onClick={() => {
												setOauthStatus(null);
												unlinkMutation.mutate({ providerId: provider.id, accountId });
											}}
										>
											Disconnect
										</button>
									) : (
										<button
											type="button"
											className={cn(
												"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
												linkingProvider === provider.id && "opacity-60",
											)}
											disabled={linkingProvider === provider.id}
											onClick={async () => {
												setOauthStatus(null);
												setLinkingProvider(provider.id);
												try {
													await linkSocial({
														provider: provider.id,
														callbackURL: `${window.location.origin}/settings?tab=account`,
													});
												} catch (error) {
													setOauthStatus({
														tone: "error",
														message: error instanceof Error ? error.message : "Failed to start OAuth flow.",
													});
												} finally {
													setLinkingProvider(null);
												}
											}}
										>
											Connect
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
				{renderStatus(oauthStatus)}
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Active Sessions</h3>
				<div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="font-medium">{sessionsQuery.isLoading ? "Checking sessions..." : `${activeSessionCount} active session(s)`}</div>
						<p className="text-xs text-muted-foreground">Sign out devices you no longer use.</p>
					</div>
					<button
						type="button"
						className={cn("rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent", revokeOtherSessionsMutation.isPending && "opacity-60")}
						disabled={revokeOtherSessionsMutation.isPending}
						onClick={() => {
							setSessionStatus(null);
							revokeOtherSessionsMutation.mutate();
						}}
					>
						Sign out other sessions
					</button>
				</div>
				{renderStatus(sessionStatus)}
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Integrations</h3>
				<p className="text-sm text-muted-foreground">Manage the knowledge sources that power your daily digest.</p>
				<div className="divide-y rounded-lg border">
					<div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-black font-bold text-white">N</div>
							<div>
								<div className="font-medium">Notion</div>
								<div className={cn("text-xs font-medium", notionStatus?.connected ? "text-primary" : "text-muted-foreground")}>
									{notionStatusQuery.isLoading
										? "Checking connection..."
										: notionStatus?.connected
											? `Connected${notionStatus.workspaceName ? ` · ${notionStatus.workspaceName}` : ""}`
											: "Not connected"}
								</div>
								{notionStatus?.connected ? (
									<div className="text-xs text-muted-foreground">{notionStatus.databases?.length ?? 0} databases selected</div>
								) : null}
							</div>
						</div>
						<Link to="/onboarding/configure-notion" className="text-sm text-primary hover:underline">
							Manage
						</Link>
					</div>
					<div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-primary-foreground">O</div>
							<div>
								<div className="font-medium">Obsidian</div>
								<div className={cn("text-xs font-medium", obsidianStatus?.connected ? "text-primary" : "text-muted-foreground")}>
									{obsidianStatusQuery.isLoading
										? "Checking connection..."
										: obsidianStatus?.connected
											? `Connected${obsidianStatus.vaultName ? ` · ${obsidianStatus.vaultName}` : ""}`
											: "Not connected"}
								</div>
								{obsidianStatus?.lastSeenAt ? (
									<div className="text-xs text-muted-foreground">Last seen {new Date(obsidianStatus.lastSeenAt).toLocaleString()}</div>
								) : null}
							</div>
						</div>
						<Link to="/onboarding/configure-obsidian" className="text-sm text-primary hover:underline">
							Manage
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

function BillingSettings() {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
				<h3 className="font-semibold text-primary">Current Plan: Pro</h3>
				<p className="mt-1 text-sm text-primary/80">Your next billing date is February 17, 2026.</p>
				<button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
					Manage Subscription
				</button>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Payment Information</h3>
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-10 items-center justify-center rounded border bg-muted text-[10px] font-bold">VISA</div>
						<div className="text-sm">•••• •••• •••• 4242</div>
					</div>
					<button type="button" className="text-sm hover:underline">
						Edit
					</button>
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Invoices</h3>
				<div className="divide-y rounded-lg border">
					{[
						{ date: "Jan 17, 2026", amount: "$10.00", status: "Paid" },
						{ date: "Dec 17, 2025", amount: "$10.00", status: "Paid" },
					].map((invoice, i) => (
						<div key={i} className="flex items-center justify-between p-4 text-sm">
							<div className="flex gap-4">
								<span className="text-muted-foreground">{invoice.date}</span>
								<span className="font-medium">{invoice.amount}</span>
							</div>
							<div className="flex items-center gap-4">
								<span className="font-medium text-primary">{invoice.status}</span>
								<button type="button" className="text-primary hover:underline">
									Download
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
