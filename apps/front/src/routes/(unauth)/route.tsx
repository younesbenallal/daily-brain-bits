import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(unauth)")({
  component: RouteComponent,
  beforeLoad: async ({ context: { auth }, location }) => {
    if (auth?.session) {
      // Extract callback URL from query params, default to /articles
      const params = new URLSearchParams(location.search);
      const callbackUrl = params.get("callbackUrl") || "/articles";
      throw redirect({ to: callbackUrl });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/(unauth)"!</div>;
}
