"use client";
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client";
import { useUsersQuery } from "@/app/features/user/services/userQueries";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  notionToken?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isNotionConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshSession: () => void;
  checkNotionConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: session, isPending: loading, refetch } = useSession();
  const [userWithNotion, setUserWithNotion] = React.useState<User | null>(null);
  const queryClient = useQueryClient();
  const usersQuery = useUsersQuery(!!session?.user);

  useEffect(() => {
    const handleFocus = () => {
      refetch();
      // Also refetch users data when window gets focus
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
        // Also refetch users data when tab becomes visible
        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch, session?.user, queryClient]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch, session?.user, queryClient]);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn.email({
        email,
        password,
      });
      if (result.error) {
        throw new Error(result.error.message || "Login failed");
      }
      refetch();
    } catch (error) {
      console.error("❌ AuthProvider: Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      console.log("🚀 AuthProvider: Registering with Better Auth...");

      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed");
      }
      refetch();
    } catch (error) {
      console.error("❌ AuthProvider: Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      refetch();
      // Clear user-related queries on logout
      queryClient.removeQueries({ queryKey: ["users"] });
    } catch (error) {
      console.error("❌ AuthProvider: Logout error:", error);
      throw error;
    }
  };

  const refreshSession = () => {
    refetch();
  };

  // Function to check Notion connection using TanStack Query
  const checkNotionConnection = async () => {
    if (!session?.user) return;

    try {
      // Refetch users data
      await usersQuery.refetch();

      if (usersQuery.data) {
        // Find the local user that matches the Better Auth session email
        const localUser = usersQuery.data.find(
          (user: any) => user.email === session.user.email
        );

        if (localUser) {
          setUserWithNotion({
            ...session.user,
            notionToken: localUser.notionToken,
          });
          console.log(
            "🔍 Found local user with Notion token:",
            !!localUser.notionToken
          );
        } else {
          console.log("🔍 No local user found for Better Auth user");
        }
      }
    } catch (error) {
      console.error("Error checking notion connection:", error);
    }
  };

  // Check Notion connection when the user changes or when users data changes
  useEffect(() => {
    if (session?.user && usersQuery.data) {
      checkNotionConnection();
    } else {
      setUserWithNotion(null);
    }
  }, [session?.user, usersQuery.data]);

  const user = userWithNotion || (session?.user as User) || null;
  const isAuthenticated = !!user && user.emailVerified;
  const isNotionConnected = !!(user as User)?.notionToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isNotionConnected,
        login,
        register,
        logout,
        loading: loading || usersQuery.isLoading,
        refreshSession,
        checkNotionConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
