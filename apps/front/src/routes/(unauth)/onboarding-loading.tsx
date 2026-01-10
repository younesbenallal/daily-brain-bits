import { createFileRoute } from "@tanstack/react-router";
import { OnboardingLayout } from "../../components/layouts/onboarding-layout";

export const Route = createFileRoute("/(unauth)/onboarding-loading")({
  component: OnboardingLoadingPage,
});

function OnboardingLoadingPage() {
  return (
    <OnboardingLayout
      footer={
        <>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-base font-medium">Syncing ongoing</span>
        </>
      }
    >
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-[#163c6b]">
          We are preparing your app..
        </h1>
      </div>
    </OnboardingLayout>
  );
}
