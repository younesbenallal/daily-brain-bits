import { cn } from "@/lib/utils";

export type StatusTone = "success" | "error";
export type StatusMessageState = { tone: StatusTone; message: string } | null;

export function StatusMessage({ status }: { status: StatusMessageState }) {
	if (!status) {
		return null;
	}

	return <p className={cn("text-sm", status.tone === "error" ? "text-destructive" : "text-primary")}>{status.message}</p>;
}
