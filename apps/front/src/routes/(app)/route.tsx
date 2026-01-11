import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)")({
  component: RouteComponent,
  beforeLoad: ({ location, context }) => {
    if (!context.auth) {
      throw redirect({ to: "/login", search: { callbackUrl: location.pathname } });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/(app)"!</div>;
}
