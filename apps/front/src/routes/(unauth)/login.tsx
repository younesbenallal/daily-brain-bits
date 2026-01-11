import { AppleLight, Google } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/(unauth)/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  return (
    <OnboardingLayout>
      <form className="space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-[30px] font-semibold leading-tight text-[hsl(var(--primary))]">What's your email?</h1>
          <p className="text-sm leading-relaxed text-[#64748b]">
            It allows Daily Brain Bits to send you your notes by email. We will send you some product updates as well.
          </p>
        </div>

        <div className="space-y-3">
          <Input placeholder="real-email@no-tmp-email.com" type="email" />
          <Button
            className="w-full"
            type="submit"
            onClick={() => {
              router.navigate({ to: "/preferences" });
            }}
          >
            Login
          </Button>
        </div>

        <p className="text-center text-sm text-black">
          Don't have an account?{" "}
          <Button variant="link" className="h-auto p-0 font-medium">
            Sign up
          </Button>
        </p>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-[#e5e7eb]" />
          <span className="font-ui text-sm font-medium text-[#a3a3a3]">Or</span>
          <div className="h-px flex-1 bg-[#e5e7eb]" />
        </div>

        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-between px-4" type="button">
            <div className="flex items-center gap-3">
              <Google className="size-4" />
              Login with Google
            </div>
            <span className="text-[#a3a3a3]" aria-hidden="true">
              →
            </span>
          </Button>
          <Button variant="secondary" className="w-full justify-between px-4" type="button">
            <div className="flex items-center gap-3">
              <AppleLight className="size-4" />
              Login with Apple
            </div>
            <span className="text-[#a3a3a3]" aria-hidden="true">
              →
            </span>
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
