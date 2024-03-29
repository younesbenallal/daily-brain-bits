import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

import { DefaultWrapper } from "@/components/default-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { SubmitButton } from "../../components/submit-button";
import { OAauthButtons } from "./oauth-buttons";

export default async function LoginPage() {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return redirect("/");
	}
	const signIn = async (formData: FormData) => {
		"use server";

		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const supabase = createClient();

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			return redirect("/login?message=Could not authenticate user");
		}

		return redirect("/protected");
	};

	const signUp = async (formData: FormData) => {
		"use server";

		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const supabase = createClient();

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `http://localhost:4000/auth/callback`,
			},
		});

		if (error) {
			return redirect("/login?message=Could not authenticate user");
		}

		return redirect("/login?message=Check email to continue sign in process");
	};

	// if (isAuthenticated === true) redirect("/");

	return (
		<>
			<Header />
			<main className="top-0 flex flex-col items-center snap-y snap-mandatory">
				<DefaultWrapper>
					<div className="grid gap-10 p-6 m-auto text-center max-w-96">
						<div>
							<h2 className="mb-2">Login</h2>
							<p className="text-muted-foreground">Mollit laborum deserunt in amet.</p>
						</div>
						<div className="grid gap-2">
							<div className="grid gap-4 text-left">
								<Label className="sr-only" htmlFor="email">
									Email
								</Label>
								<Input id="email" placeholder="joe-the-reader@email.com" type="email" autoCapitalize="none" autoComplete="email" autoCorrect="off" />
							</div>
							<SubmitButton
								formAction={signUp}
								className="border border-foreground/20 rounded-md px-4 py-2 text-foreground mb-2"
								pendingText="Signing Up..."
							>
								Sign In
							</SubmitButton>
						</div>
						<OAauthButtons />
					</div>
				</DefaultWrapper>
			</main>
		</>
	);
}
