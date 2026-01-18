import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SettingsPage } from "@/components/settings/settings-page";
import { settingsTabs } from "@/components/settings/settings-constants";

const settingsSearchSchema = z.object({
	tab: z.enum(settingsTabs).default("app"),
});

export const Route = createFileRoute("/(app)/settings")({
	validateSearch: (search) => settingsSearchSchema.parse(search),
	component: SettingsRoute,
});

function SettingsRoute() {
	const { tab } = Route.useSearch();
	return <SettingsPage tab={tab} />;
}
