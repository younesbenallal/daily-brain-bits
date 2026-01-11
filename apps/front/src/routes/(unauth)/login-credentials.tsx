import { createFileRoute } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/(unauth)/login-credentials")({
  component: LoginCredentialsPage,
});

function LoginCredentialsPage() {
  return (
    <OnboardingLayout>
      <form className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl text-primary">What's your email?</h1>
          <p className="text-sm text-[#64748b]">
            It allows Daily Brain Bits to send you your notes by email. We will send you some product updates as well.
          </p>
        </div>

        <div className="space-y-3">
          <Input defaultValue="younes@gmail.com" type="email" />
          <Input defaultValue="********" type="password" />
          <Button className="w-full" type="submit">
            Login
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
