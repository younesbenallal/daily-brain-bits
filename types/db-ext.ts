import type { User } from "@supabase/supabase-js";
import { Tables } from "./db";

type Integrations = Tables<"integrations">;
type Profiles = Tables<"profiles">;

export type UserWithIntegrations = User & { integrations: Integrations[] | null; profile: Profiles | null };

export type NotionMetadata = {
	workspace_name: string;
	workspace_id: string;
	workspace_icon: string;
};
