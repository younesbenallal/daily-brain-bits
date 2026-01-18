import { Link } from "@tanstack/react-router";
import type { SettingsTab } from "./settings-constants";
import { settingsTabs } from "./settings-constants";
import { cn } from "@/lib/utils";

export function SettingsTabs({ activeTab }: { activeTab: SettingsTab }) {
	return (
		<div className="flex gap-1 border-b border-border pb-px">
			{settingsTabs.map((tab) => (
				<Link
					key={tab}
					to="/settings"
					search={{ tab }}
					className={cn(
						"relative px-4 py-2 text-sm font-medium transition-colors",
						activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}
				</Link>
			))}
		</div>
	);
}
