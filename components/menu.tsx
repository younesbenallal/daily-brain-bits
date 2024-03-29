"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Cog8ToothIcon, ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

interface MenuProps extends React.ComponentPropsWithoutRef<"div"> {}
export function Menu({ ...props }: MenuProps) {
	const router = useRouter();

	const logout = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.refresh();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary-100">
					<Cog8ToothIcon className="w-6 h-6" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem onClick={logout}>
					<ArrowRightStartOnRectangleIcon className="w-4 h-4 mr-2" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
