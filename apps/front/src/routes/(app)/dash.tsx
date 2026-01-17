import { Obsidian } from "@ridemountainpig/svgl-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@/components/ui/button";
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

	const currentItem = items[currentIndex];
	const contentBlocks = useMemo(() => parseContentBlocks(currentItem?.content ?? ""), [currentItem?.content]);
	const digestDateLabel = formatDigestDate(digest?.scheduledFor ?? digest?.createdAt ?? null);
	const noteTitle = currentItem?.title?.trim() || "Untitled note";
	const canMoveBack = currentIndex > 0;
	const canMoveForward = currentIndex < items.length - 1;

	return (
		<AppLayout maxWidth="max-w-[600px]">
			<div className="flex flex-col gap-10">
				{/* Top Info & Navigation */}
				<div className="flex items-center justify-between border-b border-border/40 pb-6">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<Sparkles className="h-3.5 w-3.5 text-primary" />
							<span className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Today’s Digest</span>
						</div>
						<p className="font-ui text-xs font-semibold text-muted-foreground/70">{digestDateLabel}</p>
					</div>

					{items.length > 0 && (
						<div className="flex items-center gap-4">
							<div className="text-right">
								<p className="font-ui text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">Note</p>
								<p className="font-ui text-[13px] font-bold text-foreground/80">
									{currentIndex + 1} <span className="mx-0.5 text-muted-foreground/30">/</span> {items.length}
								</p>
							</div>
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
						</div>
					)}
				</div>

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
							<h1 className="font-display text-[32px] font-semibold leading-[1.15] text-primary">{noteTitle}</h1>

							<div className="max-h-[50vh] space-y-6 overflow-y-auto pr-4 font-body text-[16px] leading-relaxed text-muted-foreground/90 selection:bg-primary/10">
								{contentBlocks.length > 0 ? (
									contentBlocks.map((block, index) => {
										const blockKey = `${block.type}-${block.content || (block.type === "list" ? block.items.join("") : index)}`;
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
									<div className="rounded-full border border-border/60 bg-white/50 p-1.5 shadow-sm">
										<SourceIcon sourceKind={currentItem?.sourceKind ?? null} />
									</div>
									<div className="flex flex-col">
										<p className="font-ui text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">Source</p>
										<p className="font-ui text-[13px] font-semibold text-muted-foreground/70">
											{currentItem?.sourceName || (currentItem?.sourceKind === "obsidian" ? "Obsidian" : "Notion")}
										</p>
									</div>
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

function formatDigestDate(value: string | null) {
	if (!value) {
		return "Today";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "Today";
	}
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

function SourceIcon({ sourceKind }: { sourceKind: "obsidian" | "notion" | null }) {
	if (sourceKind === "obsidian") return <Obsidian className="h-4 w-4" />;
	if (sourceKind === "notion") {
		return (
			<svg role="img" aria-label="Notion" viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
				<path d="M4.459 4.208c.746.606 1.026.56 1.866.56L17.11 4.535c.793 0 .7.14.56.886l-1.353 8.35c-.14.933-.513 1.026-1.12.606l-9.141-6.11c-.42-.326-.42-.513-.42-1.026l.42-3.033zm.234 6.772c.42.327.513.7.42 1.213l-1.167 7.42c-.093.513.187.7.747.7h13.905c.653 0 .933-.28.933-.933v-12.78c0-.654-.28-.934-.933-.934h-2.146c-.654 0-.934.28-.934.934v8.818c0 .653-.28.933-.933.933H6.652c-.654 0-.934-.28-.934-.933V6.447c0-.654.28-.934.934-.934h1.726c.653 0 .933.28.933.934v4.533z" />
			</svg>
		);
	}
	return <Sparkles className="h-4 w-4 text-muted-foreground/40" />;
}
