import type { SettingsTab } from "./settings-constants";
import { AppLayout } from "@/components/layouts/app-layout";
import { SettingsTabs } from "./settings-tabs";
import { AppSettings } from "./app-settings";
import { AccountSettings } from "./account-settings";
import { BillingSettings } from "./billing-settings";
import { settingsTabs } from "./settings-constants";
import { useSettingsCapabilities } from "./settings-utils";

export function SettingsPage({ tab }: { tab: SettingsTab }) {
	const { capabilities } = useSettingsCapabilities();
	const billingEnabled = capabilities?.billingEnabled ?? true;
	const tabs = billingEnabled ? settingsTabs : settingsTabs.filter((item) => item !== "billing");
	const activeTab = billingEnabled ? tab : tab === "billing" ? "app" : tab;

	return (
		<AppLayout maxWidth="max-w-[800px]">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="font-display text-3xl font-semibold text-primary">Settings</h1>
					<p className="mt-1 text-muted-foreground">Manage your application preferences and account details.</p>
				</div>

				<SettingsTabs activeTab={activeTab} tabs={tabs} />

				<div className="mt-4">
					{activeTab === "app" && <AppSettings />}
					{activeTab === "account" && <AccountSettings />}
					{activeTab === "billing" && <BillingSettings />}
				</div>
			</div>
		</AppLayout>
	);
}
