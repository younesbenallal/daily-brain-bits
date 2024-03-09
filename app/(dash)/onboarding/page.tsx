import * as React from "react";

import { DefaultWrapper } from "@/components/default-wrapper";

import { PreferencesStep } from "./preference-step";
import { AddSourcesStep } from "./add-sources-step";
import { ConfigureSourcesStep } from "./configure-sources-step";
import { getUser } from "@/app/actions/users";
import { OnboardingSteps } from "@/components/onboarding-steps";

export default async function OnboardingPage({ children }: { children: React.ReactNode }) {
	const user = await getUser();
	const steps = [<PreferencesStep />, <AddSourcesStep user={user} />, <ConfigureSourcesStep />];

	return (
		<DefaultWrapper>
			<OnboardingSteps steps={steps} />
		</DefaultWrapper>
	);
}
