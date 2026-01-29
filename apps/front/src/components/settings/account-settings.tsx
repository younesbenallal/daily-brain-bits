import { AccountApiKeysSettings } from "./account-api-keys-settings";
import { AccountEmailSettings } from "./account-email-settings";
import { AccountIntegrationsSettings } from "./account-integrations-settings";
import { AccountOauthSettings } from "./account-oauth-settings";
import { AccountSecuritySettings } from "./account-security-settings";
import { AccountSessionsSettings } from "./account-sessions-settings";

export function AccountSettings() {
	return (
		<div className="space-y-8">
			<AccountEmailSettings />
			<AccountSecuritySettings />
			<AccountOauthSettings />
			<AccountSessionsSettings />
			<AccountIntegrationsSettings />
			<AccountApiKeysSettings />
		</div>
	);
}
