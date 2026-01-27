import { Google, Notion } from "@ridemountainpig/svgl-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

export const Route = createFileRoute("/(unauth)/login")({
	component: LoginPage,
	validateSearch: z
		.object({
			callbackUrl: z.string().optional(),
			mode: z.enum(["login", "signup"]).optional(),
		})
		.parse,
});

function LoginPage() {
	const router = useRouter();
	const search = Route.useSearch();
	const requestedCallbackPath = search.callbackUrl || "/";
	const callbackPath = requestedCallbackPath.startsWith("/") ? requestedCallbackPath : "/";
	const callbackURL = `${window.location.origin}${callbackPath}`;
	const mode = search.mode === "signup" ? "signup" : "login";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const title = mode === "signup" ? "Create your account" : "Log in";
	const subtitle =
		mode === "signup"
			? "We’ll use this email to send your digests."
			: "Use your email/password, or continue with Google/Notion.";

	return (
		<form
			className="space-y-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(null);
				setIsSubmitting(true);

				const normalizedEmail = email.trim();
				const normalizedPassword = password;

					try {
					if (mode === "signup") {
						const fallbackName =
							normalizedEmail.includes("@") ? normalizedEmail.split("@")[0]?.replace(/\./g, " ").trim() : normalizedEmail;
						const result = await signUp.email({
							email: normalizedEmail,
							password: normalizedPassword,
							name: name.trim().length > 0 ? name.trim() : (fallbackName || "New user"),
							showOnboarding: true,
							callbackURL,
						});

							if (result?.error) {
								setError(result.error.message || "Unable to sign up.");
								return;
							}

							window.location.href = callbackPath;
							return;
						}

					const result = await signIn.email({
						email: normalizedEmail,
						password: normalizedPassword,
						callbackURL,
					});

					if (result?.error) {
						setError(result.error.message || "Unable to log in.");
						return;
					}

					window.location.href = callbackPath;
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
				} finally {
					setIsSubmitting(false);
				}
			}}
		>
			<div className="space-y-3">
				<h1 className="font-display text-[30px] font-semibold leading-tight text-primary">{title}</h1>
				<p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
			</div>

			<div className="space-y-3">
				{mode === "signup" ? (
					<Input placeholder="Name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
				) : null}
				<Input
					placeholder="Email"
					type="email"
					autoComplete="email"
					inputMode="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<Input
					placeholder="Password"
					type="password"
					autoComplete={mode === "signup" ? "new-password" : "current-password"}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<Button className="w-full" type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
				</Button>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
			</div>

			<p className="text-center text-sm text-foreground">
				{mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
				<Button
					variant="link"
					className="h-auto p-0 font-medium"
					type="button"
					onClick={() => {
						const nextMode = mode === "signup" ? "login" : "signup";
						router.navigate({ to: "/login", search: { callbackUrl: callbackPath, mode: nextMode } });
					}}
				>
					{mode === "signup" ? "Log in" : "Sign up"}
				</Button>
			</p>

			<div className="flex items-center gap-4">
				<div className="h-px flex-1 bg-border" />
				<span className="font-ui text-sm font-medium text-muted-foreground">Or</span>
				<div className="h-px flex-1 bg-border" />
			</div>

			<div className="space-y-3">
				<Button
					variant="secondary"
					className="w-full justify-between px-4"
					type="button"
					onClick={() => signIn.social({ provider: "google", callbackURL })}
				>
					<div className="flex items-center gap-3">
						<Google className="size-4" />
						Continue with Google
					</div>
					<span className="text-muted-foreground" aria-hidden="true">
						→
					</span>
				</Button>
				<Button
					variant="secondary"
					className="w-full justify-between px-4"
					type="button"
					onClick={() => signIn.social({ provider: "notion", callbackURL })}
				>
					<div className="flex items-center gap-3">
						<Notion className="size-4" />
						Continue with Notion
					</div>
					<span className="text-muted-foreground" aria-hidden="true">
						→
					</span>
				</Button>
			</div>
		</form>
	);
}
