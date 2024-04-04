"use server";

import { UserWithIntegrations } from "@/types/db-ext";
import { createClient } from "./supabase/server";

import type { TablesUpdate } from "@/types/db";

const supabase = createClient();

export const getUser = async (): Promise<UserWithIntegrations | null> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		// Fetch user's integrations and profile data
		const { data: integrations } = await supabase.from("integrations").select("*").eq("user_id", user.id);

		const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

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

export const updateUserIntegration = async (toolName: string, value: TablesUpdate<"integrations">) => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	await supabase.from("integrations").update(value).match({ user_id: user.id, tool_name: toolName });
};

export const updateUserProfile = async (value: TablesUpdate<"profiles">) => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	console.log(user.id);
	console.log("profile,", await supabase.from("profiles").select("*"));
	const { error, data } = await supabase.from("profiles").update(value).eq("user_id", user.id).select();
	console.error("error", error);
	console.log("data", data);
	if (error) throw error;
};
