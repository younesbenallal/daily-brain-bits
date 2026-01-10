import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "../../components/layouts/onboarding-layout";
import { Button } from "../../components/ui/button";

export const Route = createFileRoute("/(unauth)/choose-source")({
  component: ChooseSourcePage,
});

function ChooseSourcePage() {
  const router = useRouter();
  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl text-[#2d71c4]">Choose source</h1>
          <p className="text-sm text-[#737373]">Give us a place to swallow your notes</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {[
            { label: "Notion", id: "notion" },
            { label: "Obsidian", id: "obsidian" },
          ].map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className="h-[59px] w-[150px] gap-3 bg-white text-[#404040] border-[#d4d4d4]"
              type="button"
              onClick={() => {
                router.navigate({ to: item.id === "notion" ? "/configure-notion" : "/configure-obsidian" });
              }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e5e7eb] text-[10px] text-[#6b7280]">
                {item.label.slice(0, 1)}
              </span>
              {item.label}
            </Button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              router.navigate({ to: "/app" });
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
