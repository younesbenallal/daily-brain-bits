import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { normalizeList } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

export function AccountSecuritySettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const accountsQuery = useQuery({
		queryKey: ["auth", "accounts"],
		queryFn: () => authClient.listAccounts(),
		enabled: Boolean(user),
	});
	const accounts = normalizeList<{ providerId: string }>(accountsQuery.data);
	const hasCredentialAccount = accounts.some((account) => account.providerId === "credential");

	const [currentPassword, setCurrentPassword] = useState("");
	const [nextPassword, setNextPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [setPasswordDraft, setSetPasswordDraft] = useState("");
	const [confirmSetPassword, setConfirmSetPassword] = useState("");
	const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
	const [passwordStatus, setPasswordStatus] = useState<StatusMessageState>(null);

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

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium">Password & Security</h3>
			<div className="grid gap-4 rounded-lg border p-4">
				{hasCredentialAccount ? (
					<>
						<div className="space-y-2">
							<label className="text-sm font-medium">Current password</label>
							<input
								type="password"
								name="current-password"
								autoComplete="current-password"
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
										name="new-password"
										autoComplete="new-password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={nextPassword}
										onChange={(event) => setNextPassword(event.target.value)}
									/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Confirm new password</label>
									<input
										type="password"
										name="confirm-new-password"
										autoComplete="new-password"
										className="w-full rounded-lg border bg-background px-3 py-2"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
									/>
							</div>
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={revokeOtherSessions}
								onChange={(event) => setRevokeOtherSessions(event.target.checked)}
							/>
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
							<StatusMessage status={passwordStatus} />
						</div>
					</>
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							You signed up with a social provider. Add a password to enable email/password sign in.
						</p>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-2">
								<label className="text-sm font-medium">New password</label>
							<input
								type="password"
								name="set-password"
								autoComplete="new-password"
								className="w-full rounded-lg border bg-background px-3 py-2"
								value={setPasswordDraft}
								onChange={(event) => setSetPasswordDraft(event.target.value)}
							/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Confirm new password</label>
							<input
								type="password"
								name="confirm-set-password"
								autoComplete="new-password"
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
							<StatusMessage status={passwordStatus} />
						</div>
					</>
				)}
			</div>
		</div>
	);
}
