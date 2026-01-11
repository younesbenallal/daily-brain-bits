import { Notion } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(app)/onboarding/configure-notion")({
  component: ConfigureNotionPage,
});

function ConfigureNotionPage() {
  const router = useRouter();
  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <Notion className="h-8 w-8" />
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-[#2d71c4]">Configure Notion</h1>
          </div>
          <p className="text-sm text-[#737373]">Tell us what notes you would like to receive in your inbox</p>
        </div>

        <div className="space-y-3">
          <p className="font-ui text-base font-semibold text-[#163c6b]">Databases to pull</p>
          <p className="text-sm text-[#737373]">
            Select the database in your Notion workspace that you'd like to receive reminders for.
          </p>
          <div className="flex min-h-[45px] flex-wrap items-center gap-2 rounded-[12px] border border-[#d4d4d4] bg-white px-3 py-2">
            {["📔 Notes", "📚Books"].map((label) => (
              <span key={label} className="rounded-full bg-[#f5e1e7] px-4 py-1 text-sm font-medium text-[#262626]">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              router.navigate({ to: "/onboarding-loading" });
            }}
          >
            Go to app
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
