import { Menu } from "./menu";

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {
	isMenuVisible?: boolean;
}
export function Header({ isMenuVisible, ...props }: HeaderProps) {
	return (
		<div className="absolute w-full grid grid-cols-3">
			<div className="col-start-2 justify-self-center pt-[10vh]">
				<img src="logo.svg" className="h-24" />
			</div>
			{isMenuVisible === true && (
				<div className="mt-6 mr-6 justify-self-end">
					<Menu />
				</div>
			)}
		</div>
	);
}
