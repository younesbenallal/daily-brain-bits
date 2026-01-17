import { createFileRoute } from "@tanstack/react-router";
import { ArrowUp, Hash } from "lucide-react";
import { AppLayout } from "@/components/layouts/app-layout";

export const Route = createFileRoute("/(app)/dash")({
	component: AppPage,
});

function AppPage() {
	return (
		<AppLayout>
			<div className="flex flex-col gap-10">
				<div className="space-y-6">
					<h1 className="font-display text-[32px] leading-tight font-semibold text-primary">Est eu occaecat mollit dolore anim</h1>
					<p className="font-body text-[15px] leading-relaxed text-muted-foreground">
						Cillum pariatur quis nulla. Lorem ex et laboris nulla laboris aliqua laboris aliqua voluptate reprehenderit ex. Incididunt laborum aliquip
						dolore in laboris culpa sint nisi Lorem voluptate. Excepteur magna ad esse exercitation Lorem et ullamco aliquip.
					</p>
				</div>

				<div className="flex flex-wrap gap-3">
					{["A. Lorem", "B. Lipsum", "C. Dolor", "D. Sit Amet"].map((label) => (
						<button
							key={label}
							type="button"
							className="rounded-full border border-border bg-card px-5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
						>
							{label}
						</button>
					))}
				</div>

				<div className="flex items-center justify-between border-t border-border pt-6">
					<div className="flex items-center gap-4 text-muted-foreground/60">
						<Hash className="h-4 w-4" />
						<svg role="img" aria-label="Notion" viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
							<path d="M4.459 4.208c.746.606 1.026.56 1.866.56L17.11 4.535c.793 0 .7.14.56.886l-1.353 8.35c-.14.933-.513 1.026-1.12.606l-9.141-6.11c-.42-.326-.42-.513-.42-1.026l.42-3.033zm.234 6.772c.42.327.513.7.42 1.213l-1.167 7.42c-.093.513.187.7.747.7h13.905c.653 0 .933-.28.933-.933v-12.78c0-.654-.28-.934-.933-.934h-2.146c-.654 0-.934.28-.934.934v8.818c0 .653-.28.933-.933.933H6.652c-.654 0-.934-.28-.934-.933V6.447c0-.654.28-.934.934-.934h1.726c.653 0 .933.28.933.934v4.533z" />
						</svg>
					</div>
					<ArrowUp className="h-4 w-4 text-muted-foreground/60" />
				</div>
			</div>
		</AppLayout>
	);
}
