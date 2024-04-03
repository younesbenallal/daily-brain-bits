import { MultiSelect } from "@/components/ui/multi-select";

interface ConfigureIntegrationsStepProps extends React.ComponentPropsWithoutRef<"div"> {}
export function ConfigureIntegrationsStep({ ...props }: ConfigureIntegrationsStepProps) {
	return (
		<div className="h-full">
			<div>
				<h2>Configure Notion</h2>
				<p className="">Tell us what notes you would like to receive in your inbox</p>
			</div>
			<div className="flex flex-col justify-center w-full h-full gap-2">
				<h3 className="font-medium text-lg">Databases to pull</h3>
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
