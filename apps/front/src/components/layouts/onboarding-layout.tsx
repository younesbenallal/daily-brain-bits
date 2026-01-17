import type { ReactNode } from "react";

interface OnboardingLayoutProps {
	children: ReactNode;
	footer?: ReactNode;
}

export function OnboardingLayout({ children, footer }: OnboardingLayoutProps) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-linear-to-b from-[hsl(var(--sky-top))] to-[hsl(var(--sky-bottom))] text-foreground">
			{/* Background Clouds */}
			<img src="/cloud.png" alt="" className="pointer-events-none absolute -bottom-10 -left-24 w-[500px] select-none opacity-80" />
			<img src="/cloud.png" alt="" className="pointer-events-none absolute -bottom-20 -right-24 w-[530px] select-none opacity-80" />

			<main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
				{/* Logo */}
				<div className="mb-8 flex h-16 w-16 items-center justify-center ">
					<img src="/logo-white.svg" alt="Daily Brain Bits" className="size-16" />
				</div>

				{/* Card */}
				<div className="w-full max-w-[450px] rounded-[12px] border border-[#ededed] bg-white p-10 shadow-(--shadow-soft)">{children}</div>

				{footer ? <div className="mt-6 flex items-center gap-3 text-white">{footer}</div> : null}
			</main>
		</div>
	);
}
