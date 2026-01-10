import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "../../components/layouts/onboarding-layout";
import { Button } from "../../components/ui/button";

export const Route = createFileRoute("/(unauth)/onboarding-tutorial")({
  component: OnboardingTutorialPage,
});

function OnboardingTutorialPage() {
  const router = useRouter();
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
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl text-[#2d71c4]">How to prioritize a note</h1>
          <p className="text-sm text-[#737373]">Give us a place to swallow your notes</p>
        </div>

        <div className="flex justify-center">
          <div className="flex h-44 w-44 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#f8fafc] text-xs text-[#94a3b8]">
            Screenshot
          </div>
        </div>

        <p className="text-sm text-[#737373]">Et consequat quis ad nulla nisi tempor magna cillum laboris.</p>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              router.navigate({ to: "/onboarding-final" });
            }}
          >
            Next
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
