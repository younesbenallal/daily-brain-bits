import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/onboarding/preview")({
	beforeLoad: () => {
		throw redirect({ to: "/onboarding/onboarding-final" });
	},
	component: () => null,
});
