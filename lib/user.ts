"use server";

import { UserWithIntegrations } from "@/types/db-ext";
import { createClient } from "./supabase/server";

const supabase = createClient();

export const getUser = async (): Promise<UserWithIntegrations | null> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		// Fetch user's integrations and profile data
		const { data: integrations, error: integrationsError } = await supabase.from("integrations").select("*").eq("user_id", user.id);

		const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

		return {
			...user,
			integrations,
			profile,
		};
	}

	return null;
};

export const getNotes = async () => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		// Fetch user's notes
		const { data: notes, error } = await supabase.from("notes").select("*").eq("user_id", user.id);

		if (error) {
			console.error("Error fetching notes:", error);
			return null;
		}

		return notes;
	}

	return null;
};
