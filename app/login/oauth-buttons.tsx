"use client";

import { createClient } from "@/lib/supabase/client";
import React from "react";
import { useRef, useState } from "react";

import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function OAauthButtons() {
	const supabase = createClient();
	return (
		<>
			<div className="flex justify-center px-2 text-xs text-muted-background">Or </div>
			<div className="grid gap-4">
				<Button
					size="full"
					variant="outline"
					onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "http://localhost:4000/api/auth/callback" } })}
				>
					<Icons.google className="w-4 h-4 mr-2" /> Login with Google
				</Button>
				<Button
					size="full"
					variant="outline"
					onClick={() => supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: "http://localhost:4000/api/auth/callback" } })}
				>
					<Icons.apple className="w-4 h-4 mr-2" /> Login with Apple
				</Button>
			</div>
		</>
	);
}
