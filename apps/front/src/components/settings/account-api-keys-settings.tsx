import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, KeyIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { normalizeList } from "./settings-utils";
import { StatusMessage, type StatusMessageState } from "./status-message";

type ApiKey = {
	id: string;
	name: string | null;
	start: string;
	createdAt: Date;
	expiresAt: Date | null;
	lastUsedAt: Date | null;
};

export function AccountApiKeysSettings() {
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const user = sessionQuery.data?.user;
	const [status, setStatus] = useState<StatusMessageState>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [newKeyName, setNewKeyName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const apiKeysQuery = useQuery({
		queryKey: ["auth", "api-keys"],
		queryFn: () => authClient.apiKey.list(),
		enabled: Boolean(user),
	});

	const createMutation = useMutation({
		mutationFn: async (name: string) => authClient.apiKey.create({ name: name || undefined }),
		onSuccess: (result) => {
			setStatus({ tone: "success", message: "API key created." });
			if (result.data?.key) {
				setCreatedKey(result.data.key);
			}
			void queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
		},
		onError: (error) => {
			setStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Failed to create API key.",
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (keyId: string) => authClient.apiKey.delete({ keyId }),
		onSuccess: () => {
			setStatus({ tone: "success", message: "API key deleted." });
			void queryClient.invalidateQueries({ queryKey: ["auth", "api-keys"] });
		},
		onError: (error) => {
			setStatus({
				tone: "error",
				message: error instanceof Error ? error.message : "Failed to delete API key.",
			});
		},
	});

	const apiKeys = normalizeList<ApiKey>(apiKeysQuery.data);

	const handleCreate = () => {
		setStatus(null);
		createMutation.mutate(newKeyName);
	};

	const handleCopy = async () => {
		if (!createdKey) return;
		await navigator.clipboard.writeText(createdKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCloseCreateDialog = () => {
		setCreateDialogOpen(false);
		setNewKeyName("");
		setCreatedKey(null);
		setCopied(false);
	};

	const formatDate = (date: Date | string | null) => {
		if (!date) return "Never";
		return new Date(date).toLocaleDateString();
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium">API Keys</h3>
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger render={<Button variant="outline" size="sm" />}>Create API Key</DialogTrigger>
					<DialogContent>
						{createdKey ? (
							<>
								<DialogHeader>
									<DialogTitle>API Key Created</DialogTitle>
									<DialogDescription>
										Copy your API key now. You won't be able to see it again.
									</DialogDescription>
								</DialogHeader>
								<div className="flex items-center gap-2">
									<code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono break-all">
										{createdKey}
									</code>
									<Button variant="outline" size="icon-sm" onClick={handleCopy}>
										{copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
									</Button>
								</div>
								<DialogFooter>
									<Button onClick={handleCloseCreateDialog}>Done</Button>
								</DialogFooter>
							</>
						) : (
							<>
								<DialogHeader>
									<DialogTitle>Create API Key</DialogTitle>
									<DialogDescription>
										Create a new API key to access the API programmatically.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2">
									<label htmlFor="api-key-name" className="text-sm font-medium">
										Name (optional)
									</label>
									<Input
										id="api-key-name"
										placeholder="My API Key"
										value={newKeyName}
										onChange={(e) => setNewKeyName(e.target.value)}
									/>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={handleCloseCreateDialog}>
										Cancel
									</Button>
									<Button onClick={handleCreate} disabled={createMutation.isPending}>
										{createMutation.isPending ? "Creating…" : "Create"}
									</Button>
								</DialogFooter>
							</>
						)}
					</DialogContent>
				</Dialog>
			</div>
			<p className="text-sm text-muted-foreground">
				Manage API keys for programmatic access to your account.
			</p>

			{apiKeysQuery.isLoading ? (
				<div className="rounded-lg border p-4 text-sm text-muted-foreground">Loading API keys…</div>
			) : apiKeys.length === 0 ? (
				<div className="rounded-lg border p-6 text-center">
					<KeyIcon className="mx-auto size-8 text-muted-foreground/50" />
					<p className="mt-2 text-sm text-muted-foreground">No API keys yet.</p>
					<p className="text-xs text-muted-foreground">Create an API key to get started.</p>
				</div>
			) : (
				<div className="divide-y rounded-lg border">
					{apiKeys.map((apiKey) => (
						<div key={apiKey.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
							<div className="flex-1 min-w-0">
								<div className="font-medium truncate">{apiKey.name || "Unnamed key"}</div>
								<div className="text-xs text-muted-foreground">
									<span className="font-mono">{apiKey.start}•••</span>
									<span className="mx-2">·</span>
									<span>Created {formatDate(apiKey.createdAt)}</span>
									{apiKey.lastUsedAt && (
										<>
											<span className="mx-2">·</span>
											<span>Last used {formatDate(apiKey.lastUsedAt)}</span>
										</>
									)}
									{apiKey.expiresAt && (
										<>
											<span className="mx-2">·</span>
											<span>Expires {formatDate(apiKey.expiresAt)}</span>
										</>
									)}
								</div>
							</div>
							<button
								type="button"
								className={cn(
									"flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10",
									deleteMutation.isPending && "opacity-60",
								)}
								disabled={deleteMutation.isPending}
								onClick={() => {
									setStatus(null);
									deleteMutation.mutate(apiKey.id);
								}}
							>
								<TrashIcon className="size-4" />
								<span>Delete</span>
							</button>
						</div>
					))}
				</div>
			)}

			<StatusMessage status={status} />
		</div>
	);
}
