import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/(app)/onboarding/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
  const router = useRouter();
  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl text-[#2d71c4]">Gimme your preferences</h1>
          <p className="text-sm text-[#a3a3a3]">Help us craft your experience to your wishes.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Timezone</p>
            <p className="text-sm text-[#737373]">We tried to guess the timezone of your area.</p>
            <Input defaultValue="Europe/Paris" type="text" />
          </div>

          <div className="space-y-2">
            <p className="font-ui text-base font-semibold tracking-[0.05em] text-[#163c6b]">Email frequency</p>
            <p className="text-sm text-[#737373]">
              What is the frequency you wish to receive your notes reminders by email? We advise daily to maximise learnings.
            </p>
            <Select defaultValue="Daily">
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              router.navigate({ to: "/choose-source" });
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
