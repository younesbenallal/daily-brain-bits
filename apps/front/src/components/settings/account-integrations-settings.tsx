import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";
import { getCustomerState, getPlanSummary } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

export function AccountIntegrationsSettings() {
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const notionStatusQueryOptions = useMemo(() => orpc.notion.status.queryOptions(), []);
	const notionStatusQuery = useQuery({ ...notionStatusQueryOptions, enabled: Boolean(user) });
	const obsidianStatusQueryOptions = useMemo(() => orpc.obsidian.status.queryOptions(), []);
	const obsidianStatusQuery = useQuery({ ...obsidianStatusQueryOptions, enabled: Boolean(user) });
	const customerStateQuery = useQuery({
		queryKey: ["billing", "customer-state"],
		queryFn: () => authClient.customer.state(),
		enabled: Boolean(user),
	});
	const planSummary = getPlanSummary(getCustomerState(customerStateQuery.data));
	const isPro = planSummary.isPro;
	const [upgradeStatus, setUpgradeStatus] = useState<StatusMessageState>(null);

	const upgradeMutation = useMutation({
		mutationFn: async () => authClient.checkout({ slug: "pro" }),
		onError: (error) => {
			setUpgradeStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Unable to start checkout.",
			});
		},
	});

	const notionStatus = notionStatusQuery.data;
	const obsidianStatus = obsidianStatusQuery.data;
	const connectedCount = [notionStatus?.connected, obsidianStatus?.connected].filter(Boolean).length;

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-medium">Integrations</h3>
			<p className="text-sm text-muted-foreground">Manage the knowledge sources that power your daily digest.</p>
			{!isPro ? (
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">Free includes one source.</p>
							<p className="text-xs text-primary/80">
								{connectedCount === 0
									? "Connect one source to get started. Upgrade to add multiple sources."
									: "Upgrade to connect multiple sources and sync across tools."}
							</p>
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
			<div className="divide-y rounded-lg border">
				<div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded bg-black font-bold text-white">N</div>
						<div>
							<div className="font-medium">Notion</div>
							<div className={cn("text-xs font-medium", notionStatus?.connected ? "text-primary" : "text-muted-foreground")}>
								{notionStatusQuery.isLoading
									? "Checking connection…"
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
									? "Checking connection…"
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
	);
}
