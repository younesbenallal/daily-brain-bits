import { MultiSelect } from "@/components/ui/multi-select";

interface ConfigureIntegrationsStepProps extends React.ComponentPropsWithoutRef<"div"> {}
export function ConfigureIntegrationsStep({ ...props }: ConfigureIntegrationsStepProps) {
	return (
		<div className="h-full">
			<div>
				<h2>Configure Notion</h2>
				<p className="text-muted">Tell us what notes you would like to receive in your inbox</p>
			</div>
			<div className="flex flex-col justify-center w-full h-full gap-2">
				<h3 className="text-lg font-semibold tracking-wide text-primary-700">Databases to pull</h3>
				<p className="text-muted-foreground">We tried to guess the timezone of your area.</p>
				<MultiSelect
					options={[
						{ value: "notes", label: "💼 Notes" },
						{ value: "books", label: "📚 Books" },
					]}
				/>
			</div>
		</div>
	);
}
