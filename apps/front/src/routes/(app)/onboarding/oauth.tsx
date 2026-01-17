import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(app)/onboarding/oauth")({
	component: OAuthPage,
});

function OAuthPage() {
	const router = useRouter();
	return (
		<OnboardingLayout>
			<div className="space-y-6">
				<div className="space-y-3">
					<h1 className="font-display text-3xl text-[#2d71c4]">Choose source</h1>
					<p className="text-sm text-muted-foreground">Give us a place to swallow your notes</p>
				</div>

				<div className="space-y-4">
					{["Connected to Perso of test@gmail.com", "Connected to Sam's Vault"].map((label) => (
						<Button
							key={label}
							variant="outline"
							className="h-[59px] w-full justify-start gap-3 bg-secondary px-6 text-secondary-foreground border-border"
							type="button"
						>
							<span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">✓</span>
							{label}
						</Button>
					))}
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						onClick={() => {
							router.navigate({ to: "/onboarding/onboarding-loading" });
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
