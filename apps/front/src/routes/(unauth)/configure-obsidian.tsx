import { Obsidian } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/(unauth)/configure-obsidian")({
  component: ConfigureObsidianPage,
});

function ConfigureObsidianPage() {
  const router = useRouter();
  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Obsidian className="h-8 w-8" />
            <h1 className="font-display text-3xl text-[#2d71c4]">Configure Obsidian</h1>
          </div>
          <p className="text-sm text-[#737373]">Tell us what notes you would like to receive in your inbox</p>
        </div>

        <div className="space-y-3">
          <p className="font-ui text-base font-semibold text-[#163c6b]">Pages to pull</p>
          <p className="text-sm text-[#737373]">Pattern of the path of the notes you want to receive reminders for</p>
          <Input placeholder="*(!Journaling)" type="text" />
          <p className="font-ui text-sm text-[#163c6b]">Output example</p>
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
