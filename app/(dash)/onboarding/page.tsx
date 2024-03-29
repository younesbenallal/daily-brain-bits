import * as React from "react";

import { DefaultWrapper } from "@/components/default-wrapper";

import { PreferencesStep } from "./preference-step";
import { AddSourcesStep } from "./add-sources-step";
import { ConfigureSourcesStep } from "./configure-sources-step";
import { OnboardingSteps } from "@/components/onboarding-steps";
import { createClient } from "@/utils/supabase/server";

export default async function OnboardingPage({ children }: { children: React.ReactNode }) {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	const steps = [<PreferencesStep />, <AddSourcesStep user={user!} />, <ConfigureSourcesStep />];

	return (
		<DefaultWrapper>
			<OnboardingSteps steps={steps} />
		</DefaultWrapper>
	);
}
