import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

export default async function Page({ children }: { children: React.ReactNode }) {
	const signUp = async (formData: FormData) => {
		"use server";

		const signupSchema = z
			.object({
				name: z.string(),
				email: z.string().email(),
				password: z.string().min(8),
				confirm_password: z.string().min(8),
			})
			.refine((data) => data.password === data.confirm_password, {
				message: "Passwords don't match",
				path: ["confirm_password"],
			});

		const parseResult = signupSchema.safeParse({
			name: formData.get("name"),
			email: formData.get("email"),
			password: formData.get("password"),
			confirm_password: formData.get("confirm_password"),
		});

		if (!parseResult.success) {
			console.error(parseResult.error);
			console.error(parseResult.error.message);
			return redirect("/login/signup?error=error");
		} else {
			const supabase = createClient();

			const { error } = await supabase.auth.signUp({
				email: parseResult.data.email,
				password: parseResult.data.password,
				options: {
					data: {
						full_name: parseResult.data.name,
					},
					emailRedirectTo: `http://localhost:4000/api/auth/callback`,
				},
			});
			if (error) {
				console.error(error);
				return redirect("/login/signup?message=Could not authenticate user");
			}
		}

		return redirect("/");
		// return redirect("/login/signup?message=Check email to continue sign in process");
	};

	return (
		<>
			<div>
				<h2 className="mb-2">Sign up</h2>
				<p className="text-sm">Create an account using a password, or login with Google or Apple.</p>
			</div>
			<div className="grid gap-4">
				<form action={signUp} className="grid gap-4">
					<div className="grid gap-2 text-left">
						<Input id="name" name="name" placeholder="Full Name" autoComplete="name" />
						<Input
							id="email"
							name="email"
							placeholder="joe-the-reader@email.com"
							type="email"
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect="off"
						/>
						<Input id="password" name="password" placeholder="Enter password" type="password" autoComplete="new-password" />
						<Input id="confirm_password" name="confirm_password" placeholder="Confirm password" type="password" autoComplete="new-password" />
					</div>
					<SubmitButton pendingText="Signing Up...">Sign Up</SubmitButton>
				</form>

				<div className="text-center mt-2">
					Already have an account? <Link href="/login/">Login</Link>
				</div>
			</div>
		</>
	);
}
