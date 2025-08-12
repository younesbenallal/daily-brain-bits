import { useQuery } from "@tanstack/react-query";
import {
  getUserNotionDatabases,
  fetchNotionDatabasesByIntegrationId,
} from "./notion-database.service";

export const useUserNotionDatabasesQuery = (
  userEmail: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["user-notion-databases", userEmail],
    queryFn: () => getUserNotionDatabases(userEmail),
    enabled: enabled && !!userEmail,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useNotionDatabasesByIntegrationIdQuery = (
  integrationId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["notion-databases-by-integration", integrationId],
    queryFn: () => fetchNotionDatabasesByIntegrationId(integrationId),
    enabled: enabled && !!integrationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
