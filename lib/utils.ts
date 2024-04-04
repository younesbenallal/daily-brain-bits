import type { UserWithIntegrations } from "@/types/db-ext";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getIntegrationByTool = (user: UserWithIntegrations | null, toolName: string) =>
	user?.integrations?.find((integration) => integration.tool_name === toolName);
