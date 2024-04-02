import Image from "next/image";

import logo from "/public/logo_black.png";

export function HeaderLogin() {
	return (
		<div className="absolute w-full grid grid-cols-3">
			<div className="col-start-2 justify-self-center pt-[10vh]">
				<Image src={logo} alt="Daily Brain Bits logo" className="w-16 h-16" />
			</div>
		</div>
	);
}
