"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Cog8ToothIcon, ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";

interface MenuProps extends React.ComponentPropsWithoutRef<"div"> {}
export function Menu({ ...props }: MenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary-100">
					<Cog8ToothIcon className="w-6 h-6" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem>
					<LogoutLink className="flex flex-row items-center w-full">
						<ArrowRightStartOnRectangleIcon className="w-4 h-4 mr-2" />
						<span>Log out</span>
					</LogoutLink>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
