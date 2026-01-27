import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { orpc } from "@/lib/orpc-client";

export const Route = createFileRoute("/(app)")({
	component: RouteComponent,
	beforeLoad: async ({ location, context }) => {
		if (!context.auth) {
			throw redirect({ to: "/login", search: { callbackUrl: location.pathname } });
		}

		const isOnboardingRoute = location.pathname.startsWith("/onboarding");
		const isFinalStep = location.pathname.startsWith("/onboarding/onboarding-final");

		const rawShowOnboarding = context.auth?.user?.showOnboarding;
		let showOnboarding = typeof rawShowOnboarding === "boolean" ? rawShowOnboarding : true;

		const shouldConfirmWithServer =
			typeof rawShowOnboarding !== "boolean" || (!isOnboardingRoute && showOnboarding) || (isOnboardingRoute && !isFinalStep && !showOnboarding);

		if (shouldConfirmWithServer) {
			try {
				const onboardingStatus = await context.queryClient.fetchQuery({
					...orpc.onboarding.status.queryOptions(),
					staleTime: 0,
				});
				showOnboarding = onboardingStatus?.showOnboarding ?? showOnboarding;
			} catch {
				// Fall back to the session snapshot if the status check fails (offline, etc).
			}
		}

		if (showOnboarding && !isOnboardingRoute) {
			throw redirect({ to: "/onboarding/choose-source" });
		}

		if (!showOnboarding && isOnboardingRoute && !isFinalStep) {
			throw redirect({ to: "/dash" });
		}
	},
});

function RouteComponent() {
	return <Outlet />;
}
