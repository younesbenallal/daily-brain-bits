import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

export function AccountEmailSettings() {
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const [emailDraft, setEmailDraft] = useState("");
	const [emailStatus, setEmailStatus] = useState<StatusMessageState>(null);

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

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium">Email</h3>
			<div className="grid gap-4 rounded-lg border p-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">Current email</label>
					<div className="flex items-center gap-3">
					<input
						type="email"
						name="current-email"
						className="w-full rounded-lg border bg-background px-3 py-2"
						value={user?.email ?? ""}
						disabled
					/>
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
						<StatusMessage status={emailStatus} />
					</div>
				) : null}
				<div className="space-y-2">
					<label className="text-sm font-medium">Change email</label>
					<div className="flex flex-wrap gap-3">
						<input
							type="email"
							name="new-email"
							autoComplete="email"
							inputMode="email"
							spellCheck={false}
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
				<StatusMessage status={emailStatus} />
			</div>
		</div>
	);
}
