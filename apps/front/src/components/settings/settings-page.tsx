import type { SettingsTab } from "./settings-constants";
import { AppLayout } from "@/components/layouts/app-layout";
import { SettingsTabs } from "./settings-tabs";
import { AppSettings } from "./app-settings";
import { AccountSettings } from "./account-settings";
import { BillingSettings } from "./billing-settings";

export function SettingsPage({ tab }: { tab: SettingsTab }) {
	return (
		<AppLayout maxWidth="max-w-[800px]">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="font-display text-3xl font-semibold text-primary">Settings</h1>
					<p className="mt-1 text-muted-foreground">Manage your application preferences and account details.</p>
				</div>

				<SettingsTabs activeTab={tab} />

				<div className="mt-4">
					{tab === "app" && <AppSettings />}
					{tab === "account" && <AccountSettings />}
					{tab === "billing" && <BillingSettings />}
				</div>
			</div>
		</AppLayout>
	);
}
