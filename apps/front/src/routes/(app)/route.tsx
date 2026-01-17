import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)")({
	component: RouteComponent,
	beforeLoad: ({ location, context }) => {
		if (!context.auth) {
			throw redirect({ to: "/login", search: { callbackUrl: location.pathname } });
		}

		const showOnboarding = context.auth?.user?.showOnboarding ?? true;
		const isOnboardingRoute = location.pathname.startsWith("/onboarding");
		const isFinalStep = location.pathname.startsWith("/onboarding/onboarding-final");

		if (showOnboarding && !isOnboardingRoute) {
			throw redirect({ to: "/onboarding/preferences" });
		}

		if (!showOnboarding && isOnboardingRoute && !isFinalStep) {
			throw redirect({ to: "/dash" });
		}
	},
});

function RouteComponent() {
	return <Outlet />;
}
