interface DefaultWrapperProps extends React.ComponentPropsWithoutRef<"div"> {}

export function DefaultWrapper({ children, ...props }: DefaultWrapperProps) {
	return (
		<div className="flex items-center justify-center h-screen xl:w-1/4 ">
			<div className="bg-card text-card-foreground max-h-[50vh] rounded-md p-8 space-y-5 snap-center w-full ">{children}</div>
		</div>
	);
}
