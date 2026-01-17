import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface AppLayoutProps {
	children: ReactNode;
	maxWidth?: string;
}

export function AppLayout({ children, maxWidth = "max-w-[450px]" }: AppLayoutProps) {
	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-linear-to-b from-[hsl(var(--sky-top))] to-[hsl(var(--sky-bottom))] text-foreground">
			<header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
				<div className="flex items-center gap-2">
					<img src="/logo-transparent.svg" alt="Dbb" className="h-12 w-auto" />
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="ghost" size="icon-lg">
							<CogIcon />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuGroup>
							<DropdownMenuLabel>My Account</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Link to="/settings" search={{ tab: "app" }} className="w-full">
									App Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Link to="/settings" search={{ tab: "account" }} className="w-full">
									Account
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Link to="/settings" search={{ tab: "billing" }} className="w-full">
									Billing
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() =>
								signOut().then(() => {
									window.location.href = "/login";
								})
							}
							className="text-destructive focus:bg-destructive/10 focus:text-destructive"
						>
							Logout
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-20">
				<div
					className={cn(
						"w-full rounded-[12px] border border-white/20 bg-white/95 p-10 shadow-(--shadow-crisp) backdrop-blur-sm dark:border-white/5 dark:bg-card/95",
						maxWidth,
					)}
				>
					{children}
				</div>
			</main>

			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 overflow-hidden">
				<img src="/cloud.png" alt="" className="absolute -bottom-12 -left-32 w-[600px] opacity-80 dark:opacity-20 dark:brightness-50" />
				<img src="/cloud.png" alt="" className="absolute -right-24 bottom-4 w-[550px] opacity-70 dark:opacity-15 dark:brightness-50" />{" "}
			</div>
		</div>
	);
}

const CogIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		xmlns="http://www.w3.org/2000/svg"
		aria-label="Settings"
		aria-hidden="true"
		className={cn("size-6 text-white/70", className)}
		{...props}
	>
		<path
			fill="currentColor"
			fill-rule="evenodd"
			d="m5.557.69l-.463 1.195l-1.594.904l-1.27-.194a1.08 1.08 0 0 0-1.078.528l-.43.754a1.08 1.08 0 0 0 .086 1.217l.807 1.001v1.81L.83 8.906a1.08 1.08 0 0 0-.086 1.217l.43.754a1.08 1.08 0 0 0 1.078.528l1.27-.194l1.573.904l.463 1.196a1.08 1.08 0 0 0 1 .689h.905a1.08 1.08 0 0 0 1.002-.69l.463-1.195l1.572-.904l1.27.194a1.08 1.08 0 0 0 1.078-.528l.43-.754a1.08 1.08 0 0 0-.086-1.217l-.807-1.001v-1.81l.786-1.001a1.08 1.08 0 0 0 .086-1.217l-.43-.754a1.08 1.08 0 0 0-1.078-.528l-1.27.194l-1.573-.904L8.443.689A1.08 1.08 0 0 0 7.442 0h-.884a1.08 1.08 0 0 0-1.001.69M7 9.25a2.25 2.25 0 1 0 0-4.5a2.25 2.25 0 0 0 0 4.5"
			clip-rule="evenodd"
		/>
	</svg>
);
