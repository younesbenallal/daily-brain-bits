"use client";

import { DefaultWrapper } from "@/components/default-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";

import { useKindeBrowserClient, useKindeAuth, LoginLink } from "@kinde-oss/kinde-auth-nextjs";

export default function LoginPage() {
	const a = useKindeBrowserClient();
	const b = useKindeAuth();

	return (
		<DefaultWrapper>
			<div className="grid gap-7 max-w-96 m-auto text-center p-6">
				<div>
					<h2 className="mb-2">Login</h2>
					<p className="text-muted-foreground">Mollit laborum deserunt in amet.</p>
				</div>
				<div className="grid gap-2">
					<div className="grid gap-1">
						<Label className="sr-only" htmlFor="email">
							Email
						</Label>
						<Input id="email" placeholder="name@example.com" type="email" autoCapitalize="none" autoComplete="email" autoCorrect="off" />
					</div>
					<LoginLink
						authUrlParams={{
							connection_id: "conn_f73e9d748fb9419e98948d60a2807f9b",
						}}
					>
						<Button size="full">Sign in with email</Button>
					</LoginLink>
				</div>
				<div className="grid gap-4">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs ">
							<span className="bg-secondary px-2 text-muted-background">Or continue with</span>
						</div>
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
	);
}
