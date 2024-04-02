import Image from "next/image";
import { Menu } from "./menu";

import logo from "/public/logo_black.png";

export function Header() {
	return (
		<div className="absolute w-full flex justify-between p-12">
			<Image src={logo} alt="Daily Brain Bits logo" className="w-12 h-12" />
			<Menu />
		</div>
	);
}
