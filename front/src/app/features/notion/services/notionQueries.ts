import { useQuery } from "@tanstack/react-query";
import {
  fetchWorkspaceInfo,
  fetchDatabases,
  fetchAllNotes,
} from "./notion.service";

export const useWorkspaceInfoQuery = (email: string, enabled = true) => {
  return useQuery({
    queryKey: ["workspaceInfo", email],
    queryFn: () => fetchWorkspaceInfo(email),
    enabled: !!email && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useDatabasesQuery = (email: string, enabled = true) => {
  return useQuery({
    queryKey: ["databases", email],
    queryFn: () => fetchDatabases(email),
    enabled: !!email && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useGetAllNotesQuery = (
  integrationId: string,
  databaseIds: string[]
) => {
  return useQuery({
    queryKey: ["getAllNotes", integrationId, databaseIds],
    queryFn: () => fetchAllNotes(integrationId, databaseIds),
    enabled: !!integrationId && !!databaseIds && databaseIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
