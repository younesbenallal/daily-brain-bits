import * as React from "react";

import { createClient } from "@/utils/supabase/server";

import { PreferencesStep } from "./preference-step";
import { AddIntegrationsStep } from "./add-integrations-step";
import { ConfigureIntegrationsStep } from "./configure-integrations-step";
import { OnboardingSteps } from "./onboarding-steps";
import { redirect } from "next/navigation";

export default async function OnboardingPage({ children }: { children: React.ReactNode }) {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return redirect("/login");

	const userWithIntegrations = {
		...user,
		profile: (await supabase.from("profiles").select().eq("user_id", user.id).single()).data,
		integrations: (await supabase.from("integrations").select().eq("user_id", user?.id)).data,
	};

	const steps = [<PreferencesStep />, <AddIntegrationsStep user={userWithIntegrations} />, <ConfigureIntegrationsStep />];

	return <OnboardingSteps steps={steps} />;
}
