import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "../../components/submit-button";
import Link from "next/link";

export default async function LoginPage() {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	console.log("user login", user);

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

		return redirect("/");
	};

	return (
		<>
			<div>
				<h2 className="mb-2">Login</h2>
				<p className="text-sm">Login with your email/password, or using your Apple or Google account.</p>
			</div>
			<div className="grid gap-4">
				<form action={signIn} className="grid gap-4">
					<div className="grid gap-2 text-left">
						<Input
							id="email"
							name="email"
							placeholder="joe-the-reader@email.com"
							type="email"
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect="off"
						/>
						<Input id="password" name="password" placeholder="Password" type="password" autoComplete="current-password" />
					</div>
					<SubmitButton pendingText="Login in...">Login</SubmitButton>
				</form>

				<div className="text-center mt-2">
					No Account? <Link href="/login/signup">Sign up</Link>
				</div>
			</div>
		</>
	);
}
