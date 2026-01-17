import type { ReactNode } from "react";
import { Button } from "../ui/button";

interface AppLayoutProps {
	children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="min-h-screen text-foreground">
			<header className="flex items-center justify-between px-6 py-6 sm:px-10">
				<div className="flex items-center gap-2 text-white">
					<div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/20 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.22)]">
						Logo
					</div>
				</div>
				<Button
					variant="outline"
					size="icon-lg"
					className="rounded-full border-white/40 bg-transparent text-white/90 hover:bg-white/10 hover:text-white"
					type="button"
					aria-label="Open settings"
				>
					<svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
						<path d="M10.325 4.317a1 1 0 0 1 .95-.69h1.45a1 1 0 0 1 .95.69l.22.66a1 1 0 0 0 .94.67h.75a1 1 0 0 1 .71.3l1.03 1.03a1 1 0 0 1 .3.71v.75a1 1 0 0 0 .67.94l.66.22a1 1 0 0 1 .69.95v1.45a1 1 0 0 1-.69.95l-.66.22a1 1 0 0 0-.67.94v.75a1 1 0 0 1-.3.71l-1.03 1.03a1 1 0 0 1-.71.3h-.75a1 1 0 0 0-.94.67l-.22.66a1 1 0 0 1-.95.69h-1.45a1 1 0 0 1-.95-.69l-.22-.66a1 1 0 0 0-.94-.67h-.75a1 1 0 0 1-.71-.3l-1.03-1.03a1 1 0 0 1-.3-.71v-.75a1 1 0 0 0-.67-.94l-.66-.22a1 1 0 0 1-.69-.95v-1.45a1 1 0 0 1 .69-.95l.66-.22a1 1 0 0 0 .67-.94v-.75a1 1 0 0 1 .3-.71l1.03-1.03a1 1 0 0 1 .71-.3h.75a1 1 0 0 0 .94-.67l.22-.66Zm1.675 4.683a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
					</svg>
				</Button>
			</header>

			<main className="flex min-h-[70vh] items-center justify-center px-4 pb-12">
				<div className="w-full max-w-[520px] rounded-[12px] border border-border bg-card p-8 shadow-(--shadow-soft)">{children}</div>
			</main>
		</div>
	);
}
