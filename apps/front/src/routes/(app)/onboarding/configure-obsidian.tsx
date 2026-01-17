import { Obsidian } from "@ridemountainpig/svgl-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/configure-obsidian")({
  component: ConfigureObsidianPage,
});

function ConfigureObsidianPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [globValue, setGlobValue] = useState("");

  const statusQueryOptions = useMemo(() => orpc.obsidian.status.queryOptions(), []);
  const statusQuery = useQuery({
    ...statusQueryOptions,
    refetchInterval: (query) => {
      const data = query.state.data as { connected?: boolean } | undefined;
      return data?.connected ? false : 5_000;
    },
  });
  const statusData = statusQuery.data as
    | {
        connected: boolean;
        vaultId?: string | null;
        vaultName?: string | null;
        glob?: string | null;
        lastSeenAt?: string | null;
      }
    | undefined;
  const connected = statusData?.connected ?? false;

  useEffect(() => {
    if (statusData?.glob !== undefined && statusData?.glob !== null) {
      setGlobValue(statusData.glob);
    }
    if (statusData?.glob === null) {
      setGlobValue("");
    }
  }, [statusData?.glob]);

  const setGlobMutation = useMutation(
    orpc.obsidian.setGlob.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: statusQueryOptions.queryKey });
      },
    })
  );

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
          })
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

  const handleSaveGlob = () => {
    setGlobMutation.mutate({ glob: globValue.trim().length > 0 ? globValue.trim() : null });
  };

  const vaultLabel =
    statusData?.vaultName ??
    (statusData?.vaultId ? `Vault ${statusData.vaultId.slice(0, 8)}` : "Obsidian Vault");
  const statusLabel = connected ? `Connected to ${vaultLabel}` : "Waiting for Obsidian to connect";

  const storeUrl = "https://obsidian.md/plugins?id=daily-brain-bits";
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
          <p className="text-sm text-[#737373]">Open the Obsidian Community Plugins page and install Daily Brain Bits.</p>
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-white"
            onClick={() => window.open(storeUrl, "_blank", "noopener,noreferrer")}
          >
            Open Obsidian Community Store
          </Button>
        </div>

        <div className="space-y-3">
          <p className="font-ui text-base font-semibold text-[#163c6b]">API token</p>
          <p className="text-sm text-[#737373]">
            Generate a token, then paste it into the plugin settings inside Obsidian.
          </p>
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
            {apiKey ? (
              <Badge variant="secondary">Token ready</Badge>
            ) : (
              <Badge variant="outline">No token yet</Badge>
            )}
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
            <p className="text-sm text-[#737373]">
              {statusQuery.isLoading ? "Checking connection..." : statusLabel}
            </p>
          </div>
          {!connected ? (
            <p className="text-xs text-[#737373]">
              Add the token in Obsidian to finish linking. This page will update automatically.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="font-ui text-base font-semibold text-[#163c6b]">Pages to pull</p>
          <p className="text-sm text-[#737373]">Pattern of the path of the notes you want to receive reminders for</p>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="*(!Journaling)"
              type="text"
              value={globValue}
              onChange={(event) => setGlobValue(event.target.value)}
              disabled={!connected}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2 bg-white"
                onClick={handleSaveGlob}
                disabled={!connected || setGlobMutation.isPending}
              >
                {setGlobMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
                Save filter
              </Button>
              {setGlobMutation.isSuccess ? <span className="text-xs text-[#16a34a]">Saved</span> : null}
            </div>
            {setGlobMutation.isError ? <p className="text-sm text-[#ef4444]">Failed to save filter.</p> : null}
            {!connected ? (
              <p className="text-xs text-[#737373]">Connect the plugin first to enable filtering.</p>
            ) : null}
          </div>
          <p className="font-ui text-sm text-[#163c6b]">Output example</p>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              router.navigate({ to: "/onboarding/onboarding-loading" });
            }}
          >
            Go to app
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
