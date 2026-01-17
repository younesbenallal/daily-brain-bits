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
					<h1 className="font-display text-3xl text-[#2d71c4]">Choose source</h1>
					<p className="text-sm text-muted-foreground">Give us a place to swallow your notes</p>
				</div>

				<div className="flex flex-col items-center gap-4">
					{[
						{ label: "Notion", id: "notion", Logo: Notion },
						{ label: "Obsidian", id: "obsidian", Logo: Obsidian },
					].map((item) => (
						<Button
							key={item.id}
							variant="outline"
							className="h-[59px] w-[150px] gap-3 bg-card text-foreground border-border"
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
			</div>
		</OnboardingLayout>
	);
}
