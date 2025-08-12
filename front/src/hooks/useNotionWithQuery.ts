import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWorkspaceInfoQuery,
  useDatabasesQuery,
} from "@/app/features/notion/services/notionQueries";
import {
  useSaveNotionToken,
  useNotionAuth,
} from "@/app/features/notion/services/notionMutations";

export interface NotionUserData {
  user: {
    id: string;
    name: string;
    email: string | null;
    avatar: string;
  };
  workspace: {
    id: string;
    name: string;
    icon: string;
  };
  accessToken: string;
}

export const useNotionWithQuery = () => {
  const [notionData, setNotionData] = useState<NotionUserData | null>(null);
  const { user, isAuthenticated, isNotionConnected, checkNotionConnection } =
    useAuth();

  const email = user?.email || "";

  // Queries
  const workspaceInfoQuery = useWorkspaceInfoQuery(
    email,
    isAuthenticated && !!user?.notionToken
  );
  const databasesQuery = useDatabasesQuery(
    email,
    isAuthenticated && !!user?.notionToken
  );

  // Mutations
  const saveTokenMutation = useSaveNotionToken(checkNotionConnection);
  const notionAuthMutation = useNotionAuth();

  // Extract data from queries
  const workspaceName = workspaceInfoQuery.data?.workspace?.name || null;
  const workspaceEmail = workspaceInfoQuery.data?.user?.email || email || null;
  const databases = databasesQuery.data || [];

  useEffect(() => {
    const savedNotionData = localStorage.getItem("notionUserData");
    if (savedNotionData) {
      try {
        const data = JSON.parse(savedNotionData);
        setNotionData(data);

        if (isAuthenticated && user && data.accessToken && !isNotionConnected) {
          saveTokenMutation.mutate(
            { notionToken: data.accessToken, userEmail: user.email },
            {
              onSuccess: () => {
                localStorage.removeItem("notionUserData");
              },
            }
          );
        }
      } catch (error) {
        console.error("Error reading Notion data:", error);
      }
    }
  }, [isAuthenticated, user, isNotionConnected]);

  const connectToNotion = () => {
    notionAuthMutation.mutate();
  };

  const getNotionLabel = (defaultLabel = "Notion") => {
    if (workspaceName) {
      const email = workspaceEmail || "Email not available";
      return `Connected to ${workspaceName} (${email})`;
    }

    if (notionData) {
      const email = notionData.user.email || "Email not available";
      const workspace = notionData.workspace.name;
      return `Connected to ${workspace} (${email})`;
    }

    if (isNotionConnected) {
      return `Connected to Notion (${user?.email || "Unknown email"})`;
    }

    return defaultLabel;
  };

  return {
    notionData,
    workspaceName,
    workspaceEmail,
    databases,
    isConnecting: notionAuthMutation.isPending,
    isSavingToken: saveTokenMutation.isPending,
    isLoadingWorkspaceInfo: workspaceInfoQuery.isLoading,
    isLoadingDatabases: databasesQuery.isLoading,
    connectToNotion,
    saveNotionTokenToDatabase: (notionToken: string) => {
      if (!user?.email) return Promise.resolve(false);
      return new Promise((resolve) => {
        saveTokenMutation.mutate(
          { notionToken, userEmail: user.email },
          {
            onSuccess: () => resolve(true),
            onError: () => resolve(false),
          }
        );
      });
    },
    refetchWorkspaceInfo: workspaceInfoQuery.refetch,
    refetchDatabases: databasesQuery.refetch,
    getNotionLabel,
    isConnected: isNotionConnected,
  };
};
