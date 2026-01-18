import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, RotateCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layouts/app-layout";
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
	const normalizedContent = useMemo(
		() => stripFrontmatter(currentItem?.content ?? "", currentItem?.sourceKind),
		[currentItem?.content, currentItem?.sourceKind],
	);
	const contentBlocks = useMemo(() => parseContentBlocks(normalizedContent), [normalizedContent]);
	const properties = useMemo(() => normalizeProperties(currentItem?.properties), [currentItem?.properties]);
	const hasProperties = properties.length > 0;
	const noteTitle = currentItem?.title?.trim() || "Untitled note";
	const canMoveBack = currentIndex > 0;
	const canMoveForward = currentIndex < items.length - 1;

	return (
		<AppLayout maxWidth="max-w-[600px]">
			<div className="flex flex-col gap-10">
				{/* Top Info & Navigation */}

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
							{showProperties && currentItem && (
								<section className="space-y-3 border border-muted  p-3 rounded-md">
									<div className="flex items-center justify-between text-sm text-muted-foreground">
										<span>Properties</span>
										<span>{hasProperties ? `${properties.length} fields` : "None"}</span>
									</div>
									{hasProperties ? (
										<div className="grid gap-3 sm:grid-cols-2">
											{properties.map((property) => (
												<div key={property.key} className="">
													<div className="text-[11px] font-semibold uppercase text-muted-foreground">{property.key}</div>
													<div className="mt-1 text-sm text-foreground">{property.value}</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground italic">No properties available for this note.</p>
									)}
								</section>
							)}

							<div className="max-h-[50vh] space-y-6 overflow-y-auto pr-4 font-body text-[16px] leading-relaxed text-muted-foreground/90 selection:bg-primary/10">
								{contentBlocks.length > 0 ? (
									contentBlocks.map((block, index) => {
										const blockKey = `${block.type}-${index}`;
										if (block.type === "heading") {
											const sizeClass = block.level === 1 ? "text-2xl" : block.level === 2 ? "text-xl" : "text-lg";
											return (
												<h3 key={blockKey} className={cn("font-display font-semibold text-foreground mt-2", sizeClass)}>
													{block.content}
												</h3>
											);
										}
										if (block.type === "quote") {
											return (
												<blockquote key={blockKey} className="border-l-3 border-primary/20 pl-5 italic text-foreground/70">
													{block.content}
												</blockquote>
											);
										}
										if (block.type === "list") {
											return (
												<ul key={blockKey} className="space-y-3 pl-5">
													{block.items.map((item, itemIndex) => (
														<li key={`${blockKey}-${itemIndex}`} className="list-disc marker:text-primary/40">
															{item}
														</li>
													))}
												</ul>
											);
										}
										if (block.type === "code") {
											return (
												<pre
													key={blockKey}
													className="overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-[13px] text-foreground/80"
												>
													{block.content}
												</pre>
											);
										}
										return <p key={blockKey}>{block.content}</p>;
									})
								) : (
									<p className="italic opacity-60">This note has no readable content.</p>
								)}
							</div>
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

type ContentBlock =
	| { type: "heading"; content: string; level: number }
	| { type: "paragraph"; content: string }
	| { type: "quote"; content: string }
	| { type: "list"; items: string[] }
	| { type: "code"; content: string };

type PropertyEntry = {
	key: string;
	value: string;
};

function stripFrontmatter(content: string, sourceKind: "obsidian" | "notion" | null | undefined): string {
	if (sourceKind !== "obsidian") {
		return content;
	}
	const normalized = content.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	if (lines[0]?.trim() !== "---") {
		return content;
	}
	let endIndex = -1;
	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i]?.trim();
		if (line === "---" || line === "...") {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) {
		return content;
	}
	const remaining = lines
		.slice(endIndex + 1)
		.join("\n")
		.replace(/^\n+/, "");
	return remaining;
}

function normalizeProperties(properties: Record<string, unknown> | null | undefined): PropertyEntry[] {
	if (!properties) {
		return [];
	}
	const entries = Object.entries(properties)
		.map(([key, value]) => {
			const normalized = formatPropertyValue(value);
			if (!normalized) {
				return null;
			}
			return { key, value: normalized };
		})
		.filter((entry): entry is PropertyEntry => Boolean(entry));

	return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function formatPropertyValue(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value.toString() : null;
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	if (Array.isArray(value)) {
		const items = value.map((item) => formatPropertyValue(item)).filter((item): item is string => Boolean(item));
		return items.length > 0 ? items.join(", ") : null;
	}
	if (typeof value === "object") {
		try {
			const serialized = JSON.stringify(value);
			return serialized && serialized !== "{}" ? serialized : null;
		} catch {
			return null;
		}
	}
	return null;
}

function parseContentBlocks(content: string): ContentBlock[] {
	if (!content.trim()) {
		return [];
	}

	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const blocks: ContentBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (!line.trim()) {
			index += 1;
			continue;
		}

		if (line.startsWith("```")) {
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && !lines[index].startsWith("```")) {
				codeLines.push(lines[index]);
				index += 1;
			}
			index += 1;
			blocks.push({ type: "code", content: codeLines.join("\n").trimEnd() });
			continue;
		}

		if (/^#{1,6}\s/.test(line)) {
			const level = line.match(/^#{1,6}/)?.[0].length ?? 1;
			blocks.push({ type: "heading", level, content: line.replace(/^#{1,6}\s*/, "").trim() });
			index += 1;
			continue;
		}

		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (index < lines.length && /^>\s?/.test(lines[index])) {
				quoteLines.push(lines[index].replace(/^>\s?/, "").trim());
				index += 1;
			}
			blocks.push({ type: "quote", content: quoteLines.join(" ") });
			continue;
		}

		if (/^(-|\*|•)\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^(-|\*|•)\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^(-|\*|•)\s+/, "").trim());
				index += 1;
			}
			blocks.push({ type: "list", items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length && lines[index].trim()) {
			paragraph.push(lines[index].trim());
			index += 1;
		}
		blocks.push({ type: "paragraph", content: paragraph.join(" ") });
	}

	return blocks;
}
