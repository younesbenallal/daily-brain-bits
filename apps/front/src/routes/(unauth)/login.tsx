import { AppleLight, Google, Notion } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export const Route = createFileRoute("/(unauth)/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();

  return (
    <form className="space-y-6">
      <div className="space-y-3">
        <h1 className="font-display text-[30px] font-semibold leading-tight text-primary">What's your email?</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
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

      <p className="text-center text-sm text-foreground">
        Don't have an account?{" "}
        <Button variant="link" className="h-auto p-0 font-medium">
          Sign up
        </Button>
      </p>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[#e5e7eb]" />
        <span className="font-ui text-sm font-medium text-muted-foreground">Or</span>
        <div className="h-px flex-1 bg-[#e5e7eb]" />
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          className="w-full justify-between px-4"
          type="button"
          onClick={() => signIn.social({ provider: "google" })}
        >
          <div className="flex items-center gap-3">
            <Google className="size-4" />
            Login with Google
          </div>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-between px-4"
          type="button"
          onClick={() => signIn.social({ provider: "notion" })}
        >
          <div className="flex items-center gap-3">
            <Notion className="size-4" />
            Login with Notion
          </div>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-between px-4"
          type="button"
          onClick={() => signIn.social({ provider: "apple" })}
        >
          <div className="flex items-center gap-3">
            <AppleLight className="size-4" />
            Login with Apple
          </div>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
        </Button>
      </div>
    </form>
  );
}
