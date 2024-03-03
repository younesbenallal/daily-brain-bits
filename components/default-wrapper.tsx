interface DefaultWrapperProps extends React.ComponentPropsWithoutRef<"div"> {}

export function DefaultWrapper({ children, ...props }: DefaultWrapperProps) {
	return (
		<div className="h-screen flex justify-center items-center xl:w-1/4">
			<div className="bg-card  text-card-foreground rounded-md p-8 space-y-5 snap-center w-full">{children}</div>
		</div>
	);
}
