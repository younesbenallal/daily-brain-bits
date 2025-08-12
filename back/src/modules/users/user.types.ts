import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

// Le schéma est maintenant défini dans modules/users/user.schema.ts
// Ce fichier contient uniquement les interfaces TypeScript

export interface CreateUserRequest {
  email: string;
  name: string;
  password?: string;
  emailVerified?: boolean;
  image?: string;
  betterAuthId?: string;
  token?: string;
  notionToken?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  password?: string;
  emailVerified?: boolean;
  image?: string;
  betterAuthId?: string;
  token?: string;
  notionToken?: string;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  betterAuthId?: string;
  token?: string;
  notionToken?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
