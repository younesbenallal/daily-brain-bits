import { DefaultWrapper } from "@/components/default-wrapper";
import { HeaderLogin } from "@/components/header-login";
import { ComponentPropsWithoutRef } from "react";
import { OAauthButtons } from "./oauth-buttons";

type LayoutProps = ComponentPropsWithoutRef<"div">;
export default function Layout({ children }: LayoutProps) {
	return (
		<>
			<HeaderLogin />
			<main className="top-0 flex flex-col items-center snap-y snap-mandatory">
				<DefaultWrapper>
					<div className="grid gap-10 p-4 m-auto text-left lg:min-w-96">
						{children}
						<OAauthButtons />
					</div>
				</DefaultWrapper>
			</main>
		</>
	);
}
