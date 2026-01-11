import { createFileRoute } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";

export const Route = createFileRoute("/(app)/onboarding/onboarding-loading-2")({
  component: OnboardingLoadingTwoPage,
});

function OnboardingLoadingTwoPage() {
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
      <div className="space-y-4 text-center">
        <h1 className="font-display text-3xl text-[#163c6b]">In the meantime, let us introduce you to the app</h1>
      </div>
    </OnboardingLayout>
  );
}
