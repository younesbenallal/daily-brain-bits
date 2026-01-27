import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, RotateCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { NoteContent } from "@/components/dash/dash-note-content";
import { NoteProperties } from "@/components/dash/dash-note-properties";
import { AppLayout } from "@/components/layouts/app-layout";
import { useSettingsCapabilities } from "@/components/settings/settings-utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orpc } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/(app)/dash")({
	component: AppPage,
});

function AppPage() {
	const digestQuery = useQuery(orpc.digest.today.queryOptions());
	const { entitlements, usage } = useSettingsCapabilities();
	const noteLimit = entitlements?.limits.maxNotes ?? Number.POSITIVE_INFINITY;
	const noteCount = usage?.noteCount ?? 0;
	const showNoteUsage = noteLimit !== Number.POSITIVE_INFINITY;
	const digestData = digestQuery.data as
		| {
				digest: {
					id: number;
					scheduledFor: string | null;
					createdAt: string;
					status: "scheduled" | "sent" | "failed" | "skipped";
					items: Array<{
						id: number;
						documentId: number;
						position: number;
						title: string | null;
						content: string;
						properties: Record<string, unknown> | null;
						sourceKind: "obsidian" | "notion" | null;
						sourceName: string | null;
					}>;
				} | null;
		  }
		| undefined;
	const digest = digestData?.digest ?? null;
	const items = digest?.items ?? [];
	const [currentIndex, setCurrentIndex] = useState(0);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [showProperties, setShowProperties] = useState(false);

	useEffect(() => {
		setCurrentIndex(0);
	}, [digest?.id, setCurrentIndex]);

	useEffect(() => {
		if (currentIndex >= items.length && items.length > 0) {
			setCurrentIndex(0);
		}
	}, [currentIndex, items.length]);

	useEffect(() => {
		if (items.length === 0) {
			return;
		}
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "ArrowRight") {
				setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
			}
			if (event.key === "ArrowLeft") {
				setCurrentIndex((prev) => Math.max(prev - 1, 0));
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [items.length]);

	const recommendMutation = useMutation(
		orpc.digest.recommend.mutationOptions({
			onSuccess: (_data, variables) => {
				setFeedback(variables.direction === "more" ? "We will surface more notes like this." : "Got it — we'll show fewer like this.");
				window.setTimeout(() => setFeedback(null), 2400);
			},
		}),
	);
	const regenerateMutation = useMutation(
		orpc.digest.regenerate.mutationOptions({
			onMutate: () => {
				console.log("[dash] regenerate clicked");
			},
			onSuccess: (data) => {
				console.log("[dash] regenerate success", data);
				digestQuery.refetch();
			},
			onError: (error) => {
				console.error("[dash] regenerate error", error);
			},
		}),
	);

	const currentItem = items[currentIndex];
	const noteTitle = currentItem?.title?.trim() || "Untitled note";
	const canMoveBack = currentIndex > 0;
	const canMoveForward = currentIndex < items.length - 1;
	const obsidianVaultName = currentItem?.sourceKind === "obsidian" ? (currentItem?.sourceName ?? "Obsidian Vault") : null;

	return (
		<AppLayout maxWidth="max-w-[600px]">
			<div className="flex flex-col gap-10">
				{/* Top Info & Navigation */}
				{showNoteUsage ? (
					<div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
						Notes synced: <span className="font-medium text-foreground">{noteCount}</span> / {noteLimit}
					</div>
				) : null}

				{digestQuery.isLoading ? (
					<div className="space-y-8 animate-pulse">
						<div className="h-10 w-3/4 rounded-lg bg-muted/40" />
						<div className="space-y-4">
							<div className="h-4 w-full rounded bg-muted/30" />
							<div className="h-4 w-5/6 rounded bg-muted/30" />
							<div className="h-4 w-4/6 rounded bg-muted/30" />
						</div>
					</div>
				) : !digest || items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="mb-4 rounded-full bg-primary/5 p-4 text-primary">
							<Sparkles className="h-8 w-8" />
						</div>
						<h2 className="font-display text-2xl font-semibold text-foreground">No digest yet</h2>
						<p className="mt-2 max-w-[300px] text-[15px] text-muted-foreground">Once your sources finish syncing, today’s digest will appear here.</p>
					</div>
				) : (
					<>
						{/* Main Note Content */}
						<article className="flex flex-col gap-6">
							<div className="flex items-start justify-between gap-4">
								<h1 className="flex-1 font-display text-[32px] font-semibold leading-[1.15] text-primary">{noteTitle}</h1>
								{currentItem && (
									<DropdownMenu>
										<DropdownMenuTrigger>
											<Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuGroup>
												<DropdownMenuLabel>Note view</DropdownMenuLabel>
												<DropdownMenuSeparator />
												<DropdownMenuCheckboxItem checked={showProperties} onCheckedChange={setShowProperties} className="gap-3">
													Show properties
												</DropdownMenuCheckboxItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => {
														console.log("[dash] regenerate menu select");
														regenerateMutation.mutate({});
													}}
													disabled={regenerateMutation.isPending}
													className="cursor-pointer gap-3"
												>
													{regenerateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
													{regenerateMutation.isPending ? "Regenerating digest..." : "Regenerate digest"}
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
							{showProperties && currentItem && <NoteProperties properties={currentItem.properties} />}

							<NoteContent content={currentItem?.content ?? ""} sourceKind={currentItem?.sourceKind} vaultName={obsidianVaultName} />
						</article>

						{/* Footer Actions & Source */}
						<div className="relative">
							<div className="flex items-center justify-between border-t border-border/50 pt-8">
								<div className="flex items-center gap-3">
									{items.length > 0 && (
										<div className="flex items-center gap-4">
											<div className="text-center">
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-full"
														disabled={!canMoveBack}
														onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
													>
														<ChevronLeft className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-full"
														disabled={!canMoveForward}
														onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1))}
													>
														<ChevronRight className="h-4 w-4" />
													</Button>
												</div>
												<p className="font-ui text-[13px] font-bold text-foreground/80">
													{currentIndex + 1} <span className="mx-0.5 text-muted-foreground/30">/</span> {items.length}
												</p>
											</div>
										</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										className={cn(
											"h-9 gap-2 rounded-full px-4 text-[13px] font-medium transition-all",
											"hover:bg-primary/5 hover:text-primary text-muted-foreground",
										)}
										disabled={!currentItem || recommendMutation.isPending}
										onClick={() => currentItem && recommendMutation.mutate({ documentId: currentItem.documentId, direction: "more" })}
									>
										{recommendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
										More like this
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className={cn(
											"h-9 gap-2 rounded-full px-4 text-[13px] font-medium transition-all",
											"hover:bg-destructive/5 hover:text-destructive text-muted-foreground",
										)}
										disabled={!currentItem || recommendMutation.isPending}
										onClick={() => currentItem && recommendMutation.mutate({ documentId: currentItem.documentId, direction: "less" })}
									>
										<ThumbsDown className="h-3.5 w-3.5" />
										Fewer
									</Button>
								</div>
							</div>

							{feedback && (
								<div className="absolute -bottom-8 left-0 right-0 text-center animate-in fade-in slide-in-from-top-1 duration-300">
									<span className="text-[11px] font-medium text-primary/60 bg-primary/5 px-3 py-1 rounded-full">{feedback}</span>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</AppLayout>
	);
}
