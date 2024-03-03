"use client";

import { useRef, useState } from "react";

import { DefaultWrapper } from "@/components/default-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { LoginLink, useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const buttonRef = useRef<HTMLButtonElement>(null);
	const { isAuthenticated } = useKindeBrowserClient();

	if (isAuthenticated === true) redirect("/");

	return (
		<>
			<Header />
			<main className="top-0 flex flex-col items-center snap-y snap-mandatory">
				<DefaultWrapper>
					<div className="p-6 m-auto text-center grid gap-7 max-w-96">
						<div>
							<h2 className="mb-2">Login</h2>
							<p className="text-muted-foreground">Mollit laborum deserunt in amet.</p>
						</div>
						<div className="grid gap-2">
							<div className="text-left grid gap-4">
								<Label className="sr-only" htmlFor="email">
									Email
								</Label>
								<Input
									id="email"
									placeholder="joe-the-reader@email.com"
									type="email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect="off"
									onKeyDown={(e) => e.key === "Enter" && buttonRef.current?.click()}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<LoginLink
								authUrlParams={{
									connection_id: "conn_f73e9d748fb9419e98948d60a2807f9b",
									login_hint: email,
								}}
							>
								<Button size="full" type="submit" ref={buttonRef}>
									Sign in with email
								</Button>
							</LoginLink>
						</div>
						<div className="grid gap-4">
							<div className="relative flex justify-center text-xs ">
								<span className="px-2 text-muted-background">Or </span>
							</div>

							<LoginLink
								authUrlParams={{
									connection_id: "conn_7a43fb24d3bd4e758d915f64966e4701",
								}}
							>
								<Button size="full" variant="secondary">
									<Icons.google className="w-4 h-4 mr-2" /> Login with Google
								</Button>
							</LoginLink>
							<LoginLink
								authUrlParams={{
									connection_id: "conn_c2e442976b8b4cbca1c2eec045f95f28",
								}}
							>
								<Button size="full" variant="secondary">
									<Icons.apple className="w-4 h-4 mr-2" /> Login with Apple
								</Button>
							</LoginLink>
						</div>
					</div>
				</DefaultWrapper>
			</main>
		</>
	);
}
