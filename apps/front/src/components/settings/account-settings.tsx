import { AccountEmailSettings } from "./account-email-settings";
import { AccountSecuritySettings } from "./account-security-settings";
import { AccountOauthSettings } from "./account-oauth-settings";
import { AccountSessionsSettings } from "./account-sessions-settings";
import { AccountIntegrationsSettings } from "./account-integrations-settings";

export function AccountSettings() {
	return (
		<div className="space-y-8">
			<AccountEmailSettings />
			<AccountSecuritySettings />
			<AccountOauthSettings />
			<AccountSessionsSettings />
			<AccountIntegrationsSettings />
		</div>
	);
}
