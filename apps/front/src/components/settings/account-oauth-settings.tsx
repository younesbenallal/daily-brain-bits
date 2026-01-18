import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { authClient, linkSocial, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { normalizeList } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

export function AccountOauthSettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const accountsQuery = useQuery({
		queryKey: ["auth", "accounts"],
		queryFn: () => authClient.listAccounts(),
		enabled: Boolean(user),
	});
	const accounts = normalizeList<{ providerId: string; accountId?: string }>(accountsQuery.data);
	const [oauthStatus, setOauthStatus] = useState<StatusMessageState>(null);
	const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

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

	const unlinkMutation = useMutation({
		mutationFn: async ({ providerId, accountId }: { providerId: string; accountId?: string }) =>
			authClient.unlinkAccount({ providerId, accountId }),
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

	return (
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
								<div className="flex h-8 w-8 items-center justify-center rounded bg-muted font-semibold uppercase">
									{provider.name.slice(0, 1)}
								</div>
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
			<StatusMessage status={oauthStatus} />
		</div>
	);
}
