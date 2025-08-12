import { useQuery } from "@tanstack/react-query";
import {
  fetchUserIntegrations,
  fetchUserActiveIntegrations,
  fetchUserIntegrationByType,
  Integration,
} from "./integration.service";

export const useUserIntegrationsQuery = (userEmail: string, enabled = true) => {
  return useQuery<Integration[]>({
    queryKey: ["user-integrations", userEmail],
    queryFn: () => fetchUserIntegrations(userEmail),
    enabled: enabled && !!userEmail,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUserActiveIntegrationsQuery = (
  userEmail: string,
  enabled = true
) => {
  return useQuery<Integration[]>({
    queryKey: ["user-active-integrations", userEmail],
    queryFn: () => fetchUserActiveIntegrations(userEmail),
    enabled: enabled && !!userEmail,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUserIntegrationByTypeQuery = (
  userEmail: string,
  type: string,
  enabled = true
) => {
  return useQuery<Integration | null>({
    queryKey: ["user-integration-by-type", userEmail, type],
    queryFn: () => fetchUserIntegrationByType(userEmail, type),
    enabled: enabled && !!userEmail && !!type,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
