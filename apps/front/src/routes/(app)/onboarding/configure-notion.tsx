import { Notion } from "@ridemountainpig/svgl-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/configure-notion")({
  component: ConfigureNotionPage,
});

function ConfigureNotionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedDatabases, setSelectedDatabases] = useState<
    Array<{
      id: string;
      title: string;
      icon?: string | null;
      url?: string | null;
    }>
  >([]);

  const statusQueryOptions = useMemo(() => orpc.notion.status.queryOptions(), []);
  const statusQuery = useQuery(statusQueryOptions);
  const connected = statusQuery.data?.connected ?? false;

  const searchQuery = useQuery(
    orpc.notion.databases.search.queryOptions({
      input: { query },
      enabled: connected && query.trim().length > 0,
    })
  );

  useEffect(() => {
    if (statusQuery.data?.databases) {
      setSelectedDatabases(statusQuery.data.databases);
    }
  }, [statusQuery.data?.databases]);

  const saveMutation = useMutation(
    orpc.notion.databases.set.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: statusQueryOptions.queryKey,
        });
      },
    })
  );

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const connectUrl = `${apiBaseUrl}/api/integrations/notion/start?returnTo=${encodeURIComponent("/onboarding/configure-notion")}`;

  const toggleDatabase = (database: { id: string; title: string; icon?: string | null; url?: string | null }) => {
    setSelectedDatabases((prev) => {
      const exists = prev.some((item) => item.id === database.id);
      const next = exists ? prev.filter((item) => item.id !== database.id) : [...prev, database];
      saveMutation.mutate({ databases: next });
      return next;
    });
  };

  const selectedIds = new Set(selectedDatabases.map((item) => item.id));

  const statusLabel = connected
    ? statusQuery.data?.workspaceName
      ? `Connected to ${statusQuery.data.workspaceName}`
      : "Connected to Notion"
    : "Not connected";

  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <Notion className="h-8 w-8" />
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-[#2d71c4]">Configure Notion</h1>
          </div>
          <p className="text-sm text-[#737373]">Tell us what notes you would like to receive in your inbox</p>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="gap-2 bg-white" onClick={() => window.location.assign(connectUrl)}>
            Connect to Notion
          </Button>
          <p className="text-sm text-[#737373]">{statusQuery.isLoading ? "Checking connection..." : statusLabel}</p>
        </div>

        <div className="space-y-3">
          <p className="font-ui text-base font-semibold text-[#163c6b]">Databases to pull</p>
          <p className="text-sm text-[#737373]">
            Select the database in your Notion workspace that you'd like to receive reminders for.
          </p>
          <Input
            placeholder={connected ? "Search databases..." : "Connect Notion to search"}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!connected}
          />
          {connected ? (
            <div className="space-y-3">
              <div className="flex min-h-[45px] flex-wrap items-center gap-2 rounded-[12px] border border-[#d4d4d4] bg-white px-3 py-2">
                {selectedDatabases.length === 0 ? (
                  <span className="text-sm text-[#a3a3a3]">No databases selected yet.</span>
                ) : (
                  selectedDatabases.map((database) => (
                    <button
                      key={database.id}
                      type="button"
                      onClick={() => toggleDatabase(database)}
                      className="rounded-full bg-[#f5e1e7] px-4 py-1 text-sm font-medium text-[#262626]"
                    >
                      {database.icon ? `${database.icon} ` : ""}
                      {database.title}
                    </button>
                  ))
                )}
              </div>
              {searchQuery.data?.databases && searchQuery.data.databases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[#737373]">Search results</p>
                  <div className="space-y-2">
                    {searchQuery.data.databases.map((database) => {
                      const isSelected = selectedIds.has(database.id);
                      return (
                        <button
                          key={database.id}
                          type="button"
                          onClick={() => toggleDatabase(database)}
                          className={`flex w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left text-sm ${
                            isSelected ? "border-[#2d71c4] bg-[#ecf3fb]" : "border-[#e5e7eb] bg-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {database.icon ? <span>{database.icon}</span> : null}
                            <span>{database.title}</span>
                          </span>
                          <span className="text-xs text-[#737373]">{isSelected ? "Selected" : "Select"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {searchQuery.isFetching && <p className="text-sm text-[#a3a3a3]">Searching databases...</p>}
              {searchQuery.isError && <p className="text-sm text-[#ef4444]">Failed to load databases.</p>}
              {saveMutation.isError && <p className="text-sm text-[#ef4444]">Failed to save selection.</p>}
            </div>
          ) : (
            <div className="flex min-h-[45px] items-center rounded-[12px] border border-dashed border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#a3a3a3]">
              Connect Notion to pick databases.
            </div>
          )}
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
