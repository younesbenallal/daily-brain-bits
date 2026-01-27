import { Notion, Obsidian } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(app)/onboarding/choose-source")({
	component: ChooseSourcePage,
});

function ChooseSourcePage() {
	const router = useRouter();
	return (
			<OnboardingLayout>
				<div className="space-y-6">
					<div className="space-y-3">
						<h1 className="font-display text-3xl text-primary">Where does your second brain live?</h1>
						<p className="text-sm text-muted-foreground">
							We\'ll pull insights from the notes you\'ve already captured—no re-organizing needed.
						</p>
					</div>

				<div className="flex flex-col gap-3">
					{[
						{ label: "Notion", id: "notion", Logo: Notion },
						{ label: "Obsidian", id: "obsidian", Logo: Obsidian },
					].map((item) => (
						<Button
							key={item.id}
							variant="outline"
							className="h-[59px] w-full justify-center gap-3 border-border bg-card text-foreground"
							type="button"
							onClick={() => {
								router.navigate({
									to: item.id === "notion" ? "/onboarding/configure-notion" : "/onboarding/configure-obsidian",
								});
							}}
						>
							<item.Logo className="h-5 w-5" />
							{item.label}
						</Button>
					))}
				</div>

				<p className="text-xs text-muted-foreground">
					We only access what you explicitly connect. You stay in control of your data.
				</p>
			</div>
		</OnboardingLayout>
	);
}
