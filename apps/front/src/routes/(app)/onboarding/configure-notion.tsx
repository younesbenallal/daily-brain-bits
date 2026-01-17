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
	const [selectedDatabases, setSelectedDatabases] = useState<NotionDatabase[]>([]);

	const statusQueryOptions = orpc.notion.status.queryOptions();
	const statusQuery = useQuery(statusQueryOptions);
	const statusData = statusQuery.data;
	const connected = statusData?.connected ?? false;

	const searchQuery = useQuery(
		orpc.notion.databases.search.queryOptions({
			input: { query },
			enabled: connected && query.trim().length > 0,
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

	console.log(statusData);

	const statusLabel = connected ? (statusData?.workspaceName ? `Connected to ${statusData.workspaceName}` : "Connected to Notion") : "Not connected";
	const canProceed = connected && isOnboardingStepComplete("configureNotion", { connected: true as const });

	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<Notion className="h-8 w-8" />
					<div className="flex items-center gap-3">
						<h1 className="font-display text-3xl text-[#2d71c4]">Configure Notion</h1>
					</div>
					<p className="text-sm text-muted-foreground">Tell us what notes you would like to receive in your inbox</p>
				</div>

				<div className="space-y-3">
					<Button type="button" variant="outline" className="gap-2 bg-white" onClick={handleConnect}>
						Connect to Notion
					</Button>
					<p className="text-sm text-muted-foreground">{statusQuery.isLoading ? "Checking connection..." : statusLabel}</p>
					{connected && statusData?.workspaceName ? (
						<div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-sm text-foreground">
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
					<p className="font-ui text-base font-semibold text-[#163c6b]">Databases to pull</p>
					<p className="text-sm text-muted-foreground">Select the database in your Notion workspace that you'd like to receive reminders for.</p>

					<Tags>
						<TagsTrigger
							disabled={!connected}
							placeholder={connected ? "Select databases..." : "Connect Notion to pick databases"}
							className="bg-white"
						>
							{selectedDatabases.map((database) => (
								<TagsValue key={database.id} onRemove={() => toggleDatabase(database)} className="bg-[#f5e1e7] text-[#262626] hover:bg-[#f5e1e7]/80">
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
												{isSelected && <CheckIcon className="ml-auto h-4 w-4 text-[#2d71c4]" />}
											</TagsItem>
										);
									})}
								</TagsGroup>
							</TagsList>
						</TagsContent>
					</Tags>

					{saveMutation.isError && <p className="text-sm text-destructive">Failed to save selection.</p>}
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!canProceed}
						onClick={() => {
							// Trigger sync (fire and forget - don't wait for it)
							if (selectedDatabases.length > 0) {
								syncMutation.mutate({}, { onError: (error) => console.error("Failed to start sync:", error) });
							}
							// Navigate immediately to loading page which will poll for status
							router.navigate({ to: "/onboarding/onboarding-loading" });
						}}
					>
						Go to app
						<span aria-hidden="true">→</span>
					</Button>
				</div>
				{!canProceed ? <p className="text-sm text-muted-foreground">Connect your Notion workspace to continue.</p> : null}
			</div>
		</OnboardingLayout>
	);
}
