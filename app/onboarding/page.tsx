import React from "react";

import { crimson } from "../layout";
import { DefaultWrapper } from "@/components/Note";
import { Onboarding, Step, Field } from "@reactive-labs/onboarding";

export default function OnboardingPage() {
	return (
		<DefaultWrapper>
			<h2 className={crimson.className + " font-semibold text-primary-600 text-3xl"}>Title step 1</h2>
		</DefaultWrapper>
	);
}
