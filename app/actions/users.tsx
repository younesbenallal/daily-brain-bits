"use server";

import { db } from "@/db";
import { type User, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import bcrypt from "bcrypt";

export const getOrCreateUser = async () => {
	const { isAuthenticated, getUser } = getKindeServerSession();

	if (!isAuthenticated) return null;
	const kindeUser = (await getUser())!;

	const user = (await db.select().from(users).where(eq(users.id, kindeUser.id)))[0];
	if (!user) {
		const apiKey = await generateApiKey();
		await db.insert(users).values({ id: kindeUser.id, email: kindeUser.email!, apiKey });
	}
	return user;
};

const generateApiKey = async () => {
	const saltRounds = 10;
	const token = crypto.randomUUID();
	return await bcrypt.hash(token, saltRounds);
};

export const getUser = async (): Promise<User> => {
	const { getUser } = getKindeServerSession();
	const kindeUser = (await getUser())!;
	return (await db.select().from(users).where(eq(users.id, kindeUser.id)))[0];
};
