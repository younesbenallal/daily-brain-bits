import { Obsidian } from "@ridemountainpig/svgl-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

const REFRESH_INTERVAL = 5_000;

export const Route = createFileRoute("/(app)/onboarding/configure-obsidian")({
	component: ConfigureObsidianPage,
});

function ConfigureObsidianPage() {
	const router = useRouter();
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [apiKeyError, setApiKeyError] = useState<string | null>(null);
	const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

	const statusQueryOptions = useMemo(() => orpc.obsidian.status.queryOptions(), []);
	const statusQuery = useQuery({
		...statusQueryOptions,
		refetchInterval: (query) => {
			const data = query.state.data as { connected?: boolean } | undefined;
			return data?.connected ? false : REFRESH_INTERVAL;
		},
	});
	const statusData = statusQuery.data as
		| {
				connected: boolean;
				vaultId?: string | null;
				vaultName?: string | null;
				lastSeenAt?: string | null;
		  }
		| undefined;
	const connected = statusData?.connected ?? false;

	const generateKeyMutation = useMutation({
		mutationFn: async () => {
			const listResult = await authClient.apiKey.list();
			if (listResult?.error) {
				throw new Error(listResult.error.message || "Failed to list API keys.");
			}
			const existing = Array.isArray(listResult?.data) ? listResult.data : [];
			const obsidianKeys = existing.filter((key) => key.prefix === "dbb_obsidian" || key.name === "Obsidian Plugin");

			if (obsidianKeys.length > 0) {
				await Promise.all(
					obsidianKeys.map(async (key) => {
						const result = await authClient.apiKey.delete({ keyId: key.id });
						if (result?.error) {
							throw new Error(result.error.message || "Failed to rotate API key.");
						}
					}),
				);
			}

			const createResult = await authClient.apiKey.create({
				name: "Obsidian Plugin",
				prefix: "dbb_obsidian",
				metadata: {
					integration: "obsidian",
				},
			});

			if (createResult?.error || !createResult?.data?.key) {
				throw new Error(createResult?.error?.message || "Failed to generate API key.");
			}

			return createResult.data.key;
		},
		onSuccess: (key) => {
			setApiKey(key);
			setApiKeyError(null);
			setCopyState("idle");
		},
		onError: (error) => {
			setApiKeyError(error instanceof Error ? error.message : "Failed to generate API key.");
		},
	});

	const handleCopy = async () => {
		if (!apiKey) {
			return;
		}
		try {
			await navigator.clipboard.writeText(apiKey);
			setCopyState("copied");
			window.setTimeout(() => setCopyState("idle"), 1_500);
		} catch {
			setApiKeyError("Failed to copy API key.");
		}
	};

	const vaultLabel = statusData?.vaultName ?? (statusData?.vaultId ? `Vault ${statusData.vaultId.slice(0, 8)}` : "Obsidian Vault");
	const statusLabel = connected ? `Connected to ${vaultLabel}` : "Waiting for Obsidian to connect";
	const canProceed =
		connected &&
		statusData?.vaultId &&
		statusData?.lastSeenAt &&
		isOnboardingStepComplete("configureObsidian", {
			connected: true as const,
			vaultId: statusData.vaultId,
			lastSeenAt: statusData.lastSeenAt,
		});

	const pluginInstallUrl = "https://github.com/younesbenallal/daily-brain-bits";
	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<Obsidian className="h-8 w-8" />
						<h1 className="font-display text-3xl text-[#2d71c4]">Configure Obsidian</h1>
					</div>
					<p className="text-sm text-[#737373]">Tell us what notes you would like to receive in your inbox</p>
				</div>

				<div className="space-y-3">
					<p className="font-ui text-base font-semibold text-[#163c6b]">Install the plugin</p>
					<p className="text-sm text-[#737373]">Open the GitHub repo to follow the plugin install steps.</p>
					<Button
						type="button"
						variant="outline"
						className="gap-2 bg-white"
						onClick={() => window.open(pluginInstallUrl, "_blank", "noopener,noreferrer")}
					>
						Open GitHub install guide
					</Button>
				</div>

				<div className="space-y-3">
					<p className="font-ui text-base font-semibold text-[#163c6b]">API token</p>
					<p className="text-sm text-[#737373]">Generate a token, then paste it into the plugin settings inside Obsidian.</p>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							variant="outline"
							className="gap-2 bg-white"
							onClick={() => generateKeyMutation.mutate()}
							disabled={generateKeyMutation.isPending}
						>
							{generateKeyMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <RefreshCwIcon className="h-4 w-4" />}
							{apiKey ? "Regenerate token" : "Generate token"}
						</Button>
					</div>
					{apiKey ? (
						<div className="flex flex-col gap-2">
							<Input readOnly value={apiKey} className="font-mono" />
							<div className="flex items-center gap-2">
								<Button type="button" variant="outline" className="gap-2 bg-white" onClick={handleCopy}>
									{copyState === "copied" ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
									{copyState === "copied" ? "Copied" : "Copy token"}
								</Button>
								<p className="text-xs text-[#737373]">Regenerating will invalidate the previous token.</p>
							</div>
						</div>
					) : null}
					{apiKeyError ? <p className="text-sm text-[#ef4444]">{apiKeyError}</p> : null}
				</div>

				<div className="space-y-3">
					<p className="font-ui text-base font-semibold text-[#163c6b]">Connection status</p>
					<div className="flex items-center gap-3">
						<Badge variant={connected ? "secondary" : "outline"}>{connected ? "Connected" : "Not connected"}</Badge>
						<p className="text-sm text-[#737373]">{statusQuery.isLoading ? "Checking connection..." : statusLabel}</p>
					</div>
					{!connected ? (
						<p className="text-xs text-[#737373]">Add the token in Obsidian to finish linking. This page will update automatically.</p>
					) : null}
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!canProceed}
						onClick={() => {
							router.navigate({ to: "/onboarding/onboarding-loading" });
						}}
					>
						Go to app
						<span aria-hidden="true">→</span>
					</Button>
				</div>
				{!canProceed ? <p className="text-sm text-[#737373]">Finish connecting the Obsidian plugin (token saved + first sync) to continue.</p> : null}
			</div>
		</OnboardingLayout>
	);
}
