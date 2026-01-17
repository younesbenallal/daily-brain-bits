import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";

export const Route = createFileRoute("/(unauth)")({
	component: RouteComponent,
	beforeLoad: async ({ context: { auth }, location }) => {
		if (auth?.session) {
			// Extract callback URL from query params, default to /
			const params = new URLSearchParams(location.search);
			const callbackUrl = params.get("callbackUrl") || "/";
			throw redirect({ to: callbackUrl });
		}
	},
});

function RouteComponent() {
	return (
		<OnboardingLayout>
			<Outlet />
		</OnboardingLayout>
	);
}
