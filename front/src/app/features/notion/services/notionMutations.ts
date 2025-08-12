import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveNotionToken,
  getNotionAuthUrl,
  exchangeCodeForToken,
} from "./notion.service";

export const useSaveNotionToken = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveNotionToken,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["workspaceInfo"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Error saving Notion token:", error);
    },
  });
};

export const useNotionAuth = () => {
  return useMutation({
    mutationFn: getNotionAuthUrl,
    onSuccess: (data) => {
      console.log("onSuccess", data);
      setTimeout(() => {
        window.location.href = data.authUrl;
      }, 100);
    },
    onError: (error) => {
      console.error("Error getting Notion auth URL:", error);
    },
  });
};

// Add this mutation to exchange code for token
export const useExchangeCodeForToken = () => {
  return useMutation({
    mutationFn: exchangeCodeForToken,
    onError: (error) => {
      console.error("Error exchanging code for token:", error);
    },
  });
};
