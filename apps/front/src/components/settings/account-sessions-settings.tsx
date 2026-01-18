import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { normalizeList } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";
import { useState } from "react";

export function AccountSessionsSettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const [sessionStatus, setSessionStatus] = useState<StatusMessageState>(null);

	const sessionsQuery = useQuery({
		queryKey: ["auth", "sessions"],
		queryFn: () => authClient.listSessions(),
		enabled: Boolean(user),
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

	const activeSessionCount = normalizeList(sessionsQuery.data).length;

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium">Active Sessions</h3>
			<div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="font-medium">
						{sessionsQuery.isLoading ? "Checking sessions…" : `${activeSessionCount} active session(s)`}
					</div>
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
			<StatusMessage status={sessionStatus} />
		</div>
	);
}
