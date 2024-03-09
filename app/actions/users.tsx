"use server";

import { db } from "@/db";
import { User, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const getUser = async (): Promise<User> => {
	const { getUser } = getKindeServerSession();
	const kindeUser = (await getUser())!;
	return (await db.select().from(users).where(eq(users.id, kindeUser.id)))[0];
};
