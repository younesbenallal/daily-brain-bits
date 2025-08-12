import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWorkspaceInfoQuery,
  useDatabasesQuery,
} from "@/app/features/notion/services/notionQueries";
import {
  useSaveNotionToken,
  useNotionAuth,
} from "@/app/features/notion/services/notionMutations";
import {
  useUserIntegrationsQuery,
  useUserActiveIntegrationsQuery,
  useUserIntegrationByTypeQuery,
} from "@/app/features/integrations/services/integrationQueries";
import { useNotionDatabasesByIntegrationIdQuery } from "@/app/features/notion-database/services/notion-databaseQueries";

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

export interface NotionDatabase {
  id: string;
  title: string;
  description: string;
  icon?: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
}

export const useNotion = () => {
  const [notionData, setNotionData] = useState<NotionUserData | null>(null);
  const { user, isAuthenticated, isNotionConnected, checkNotionConnection } =
    useAuth();

  const email = user?.email || "";
  const hasNotionToken = !!user?.notionToken;

  // Use TanStack Query hooks
  const workspaceInfoQuery = useWorkspaceInfoQuery(
    email,
    isAuthenticated && hasNotionToken
  );
  const databasesQuery = useDatabasesQuery(
    email,
    isAuthenticated && hasNotionToken
  );
  const integrationsQuery = useUserIntegrationsQuery(email, isAuthenticated);
  const activeIntegrationsQuery = useUserActiveIntegrationsQuery(
    email,
    isAuthenticated
  );
  const notionIntegrationQuery = useUserIntegrationByTypeQuery(
    email,
    "notion",
    isAuthenticated
  );
  const savedNotionDatabasesQuery = useNotionDatabasesByIntegrationIdQuery(
    notionIntegrationQuery.data?.id || "",
    isAuthenticated && !!notionIntegrationQuery.data?.id
  );
  const saveTokenMutation = useSaveNotionToken();
  const notionAuthMutation = useNotionAuth();

  // Extract data and state from queries
  const workspaceName = workspaceInfoQuery.data?.workspace?.name || null;
  const workspaceEmail = workspaceInfoQuery.data?.user?.email || email || null;
  const databases = databasesQuery.data || [];
  const integrations = integrationsQuery.data || [];
  const activeIntegrations = activeIntegrationsQuery.data || [];
  const notionIntegration = notionIntegrationQuery.data;
  const savedNotionDatabases = savedNotionDatabasesQuery.data?.databases || [];

  useEffect(() => {
    const savedNotionData = localStorage.getItem("notionUserData");
    if (savedNotionData) {
      try {
        const data = JSON.parse(savedNotionData);
        setNotionData(data);

        if (isAuthenticated && user && data.accessToken && !isNotionConnected) {
          saveNotionTokenToDatabase(data.accessToken).then((saved) => {
            if (saved) {
              localStorage.removeItem("notionUserData");
            }
          });
        }
      } catch (error) {
        console.error("Erreur lors de la lecture des données Notion:", error);
      }
    }
  }, [isAuthenticated, user, isNotionConnected]);

  const saveNotionTokenToDatabase = async (notionToken: string) => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      await saveTokenMutation.mutateAsync({
        notionToken,
        userEmail: user.email,
      });
      await checkNotionConnection();
      return true;
    } catch (error) {
      console.error("❌ Error saving notion token:", error);
      return false;
    }
  };

  const connectToNotion = () => {
    notionAuthMutation.mutate();
  };

  const getNotionLabel = (defaultLabel = "Notion") => {
    if (workspaceName) {
      const email = workspaceEmail || "Email non disponible";
      return `Connected to ${workspaceName} (${email})`;
    }

    if (notionData) {
      const email = notionData.user.email || "Email non disponible";
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
    integrations,
    activeIntegrations,
    notionIntegration,
    savedNotionDatabases,
    isConnecting: notionAuthMutation.isPending,
    isSavingToken: saveTokenMutation.isPending,
    isLoadingWorkspaceInfo: workspaceInfoQuery.isLoading,
    isLoadingDatabases: databasesQuery.isLoading,
    isLoadingIntegrations: integrationsQuery.isLoading,
    isLoadingActiveIntegrations: activeIntegrationsQuery.isLoading,
    isLoadingNotionIntegration: notionIntegrationQuery.isLoading,
    isLoadingSavedNotionDatabases: savedNotionDatabasesQuery.isLoading,
    connectToNotion,
    saveNotionTokenToDatabase,
    fetchWorkspaceInfo: workspaceInfoQuery.refetch,
    fetchDatabases: databasesQuery.refetch,
    fetchIntegrations: integrationsQuery.refetch,
    fetchActiveIntegrations: activeIntegrationsQuery.refetch,
    fetchNotionIntegration: notionIntegrationQuery.refetch,
    fetchSavedNotionDatabases: savedNotionDatabasesQuery.refetch,
    getNotionLabel,
    isConnected: isNotionConnected,
  };
};
