import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";

interface AddSourcesStepProps extends React.ComponentPropsWithoutRef<"div"> {}
export function AddSourcesStep({ ...props }: AddSourcesStepProps) {
	return (
		<div className="space-y-8 ">
			<div>
				<h2>Gimme your preferences</h2>
				<p className="text-muted">Help us craft your experience to your wishes.</p>
			</div>
			<div className="flex flex-col items-center justify-center gap-3 p-24">
				<Button size="xl" variant="secondary">
					<Icons.notion className="w-6 h-6 mr-2" /> Notion
				</Button>

				<Button size="xl" variant="secondary">
					<Icons.obsidian className="w-6 h-6 mr-2" /> Obsidian
				</Button>
			</div>
		</div>
	);
}
