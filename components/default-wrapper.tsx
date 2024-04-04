interface DefaultWrapperProps extends React.ComponentPropsWithoutRef<"div"> {}

export function DefaultWrapper({ children, ...props }: DefaultWrapperProps) {
	return (
		<div className="flex items-center justify-center h-screen  ">
			<div className="mesh-background bg-no-repeat text-card-foreground max-h-[80vh] rounded-md border border-border px-10 py-12 space-y-5 snap-center overflow-y-hidden lg:w-[800px] ">
				{children}
			</div>
		</div>
	);
}
