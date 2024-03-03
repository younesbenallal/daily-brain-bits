import { Menu } from "./menu";

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {
	isMenuVisible?: boolean;
}
export function Header({ isMenuVisible, ...props }: HeaderProps) {
	return (
		<div className="grid grid-cols-3 absolute w-full">
			<div className="col-start-2 justify-self-center pt-[10vh]">
				<img src="logo.svg" className="h-24" />
			</div>
			{isMenuVisible === true && (
				<div className="justify-self-end mt-6 mr-6">
					<Menu />
				</div>
			)}
		</div>
	);
}
