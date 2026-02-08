import { Notion } from "@ridemountainpig/svgl-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Tags, TagsContent, TagsEmpty, TagsGroup, TagsInput, TagsItem, TagsList, TagsTrigger, TagsValue } from "@/components/ui/shadcn-io/tags";
import { linkSocial } from "@/lib/auth-client";
import { isOnboardingStepComplete } from "@/lib/onboarding/step-validation";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)/onboarding/configure-notion")({
	component: ConfigureNotionPage,
});

type NotionDatabase = {
	id: string;
	title: string;
	icon?: string | null;
	url?: string | null;
};

function ConfigureNotionPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedDatabases, setSelectedDatabases] = useState<NotionDatabase[]>([]);

	const statusQueryOptions = orpc.notion.status.queryOptions();
	const statusQuery = useQuery(statusQueryOptions);
	const statusData = statusQuery.data;
	const connected = statusData?.connected ?? false;

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
		return () => window.clearTimeout(timer);
	}, [query]);

	const searchQuery = useQuery(
		orpc.notion.databases.search.queryOptions({
			input: { query: debouncedQuery },
			enabled: connected,
		}),
	);
	const searchData = searchQuery.data;

	useEffect(() => {
		if (statusData?.databases) {
			setSelectedDatabases(statusData.databases);
		}
	}, [statusData?.databases]);

	const saveMutation = useMutation(
		orpc.notion.databases.set.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: statusQueryOptions.queryKey,
				});
			},
		}),
	);

	const syncMutation = useMutation(orpc.notion.sync.now.mutationOptions());

	const handleConnect = async () => {
		await linkSocial({
			provider: "notion",
			callbackURL: `${window.location.origin}/onboarding/configure-notion`,
		});
	};

	const toggleDatabase = (database: { id: string; title: string; icon?: string | null; url?: string | null }) => {
		setSelectedDatabases((prev) => {
			const exists = prev.some((item) => item.id === database.id);
			const next = exists ? prev.filter((item) => item.id !== database.id) : [...prev, database];
			saveMutation.mutate({ databases: next });
			return next;
		});
	};

	const selectedIds = new Set(selectedDatabases.map((item) => item.id));

	const statusLabel = connected ? (statusData?.workspaceName ? `Connected to ${statusData.workspaceName}` : "Connected to Notion") : "Not connected";
	const canProceed =
		connected && isOnboardingStepComplete("configureNotion", { connected: true as const, databasesSelected: selectedDatabases.length });
	const connectButtonLabel = connected ? "Reconnect Notion" : "Connect Notion";

	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<Notion className="h-8 w-8" />
					<div className="flex items-center gap-3">
						<h1 className="font-display text-3xl text-primary">Connect Notion</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						Pick the databases with notes worth revisiting. We'll surface them in your inbox using spaced repetition.
					</p>
				</div>

				<div className="space-y-3">
					<Button type="button" variant="outline" onClick={handleConnect}>
						{connectButtonLabel}
					</Button>
					<p className="text-sm text-muted-foreground">{statusQuery.isLoading ? "Checking connection..." : statusLabel}</p>
					{connected && statusData?.workspaceName ? (
						<div className="inline-flex items-center gap-2 rounded-full border border-border  px-3 py-1 text-sm text-foreground">
							{statusData.workspaceIcon ? (
								statusData.workspaceIcon.startsWith("http") ? (
									<img src={statusData.workspaceIcon} alt="" className="h-4 w-4 rounded-full object-cover" />
								) : (
									<span aria-hidden="true">{statusData.workspaceIcon}</span>
								)
							) : null}
							<span>{statusData.workspaceName}</span>
						</div>
					) : null}
				</div>

				<div className="space-y-3">
					<p className="font-ui text-base font-semibold text-foreground">Databases</p>
					<p className="text-sm text-muted-foreground">Select at least one database. More databases = more variety in your digests.</p>

					<Tags>
						<TagsTrigger disabled={!connected} placeholder={connected ? "Select databases..." : "Connect Notion to pick databases"}>
							{selectedDatabases.map((database) => (
								<TagsValue key={database.id} onRemove={() => toggleDatabase(database)} className="bg-muted text-foreground hover:bg-muted/80">
									{database.icon ? (
										database.icon.startsWith("http") ? (
											<img src={database.icon} alt="" className="mr-1 h-3 w-3 shrink-0 rounded-sm object-contain" />
										) : (
											`${database.icon} `
										)
									) : null}
									{database.title}
								</TagsValue>
							))}
						</TagsTrigger>
						<TagsContent commandProps={{ shouldFilter: false }}>
							<TagsInput placeholder="Search databases..." value={query} onValueChange={setQuery} />
							<TagsList>
								{searchQuery.isLoading && (
									<div className="flex items-center justify-center p-4">
										<Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
										<span className="ml-2 text-sm text-muted-foreground">Searching...</span>
									</div>
								)}
								{!searchQuery.isLoading && searchData?.databases?.length === 0 && query.length > 0 && (
									<TagsEmpty>No databases found for "{query}"</TagsEmpty>
								)}
								{!searchQuery.isLoading && (!searchData?.databases || searchData.databases.length === 0) && query.length === 0 && (
									<TagsEmpty>Type to search your Notion databases...</TagsEmpty>
								)}
								<TagsGroup>
									{searchData?.databases?.map((database) => {
										const isSelected = selectedIds.has(database.id);
										return (
											<TagsItem key={database.id} onSelect={() => toggleDatabase(database)} className="cursor-pointer">
												<span className="flex items-center gap-2">
													{database.icon ? (
														database.icon.startsWith("http") ? (
															<img src={database.icon} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
														) : (
															<span>{database.icon}</span>
														)
													) : null}
													<span>{database.title}</span>
												</span>
												{isSelected && <CheckIcon className="ml-auto h-4 w-4 text-primary" />}
											</TagsItem>
										);
									})}
								</TagsGroup>
							</TagsList>
						</TagsContent>
					</Tags>

					{saveMutation.isError && <p className="text-sm text-destructive">Failed to save selection.</p>}
					{connected && selectedDatabases.length === 0 ? (
						<p className="text-sm text-muted-foreground">Select at least one database to continue.</p>
					) : null}
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!canProceed}
						onClick={() => {
							// Trigger sync (fire and forget - don't wait for it)
							syncMutation.mutate({}, { onError: (error) => console.error("Failed to start sync:", error) });
							// Navigate immediately to loading page which will poll for status
							router.navigate({ to: "/onboarding/onboarding-loading" });
						}}
					>
						Continue
						<span aria-hidden="true">→</span>
					</Button>
				</div>
				{!connected ? <p className="text-sm text-muted-foreground">Connect your Notion workspace to continue.</p> : null}
			</div>
		</OnboardingLayout>
	);
}
