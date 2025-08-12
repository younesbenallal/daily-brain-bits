"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSaveNotionToken,
  useExchangeCodeForToken,
} from "../features/notion/services/notionMutations";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, checkNotionConnection } = useAuth();
  const [status, setStatus] = useState("Processing...");
  const hasExecuted = useRef(false); // Add ref to prevent multiple executions

  const exchangeCodeMutation = useExchangeCodeForToken();
  const saveNotionTokenMutation = useSaveNotionToken();

  useEffect(() => {
    if (hasExecuted.current) {
      return;
    }

    const handleCallback = async () => {
      if (!isAuthenticated || !user) {
        setStatus("Please log in first");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus(`Error: ${error}`);
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      if (!code) {
        setStatus("No authorization code received");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      hasExecuted.current = true;

      try {
        const tokenData = await exchangeCodeMutation.mutateAsync({
          code,
          state,
        });

        await saveNotionTokenMutation.mutateAsync({
          notionToken: tokenData.accessToken,
          userEmail: user.email,
          metadata: tokenData.metadata,
          integrationName:
            tokenData.workspace_name || tokenData.metadata?.workspaceName,
        });

        setStatus("Successfully connected to Notion!");

        // Force update the auth context to detect the new Notion connection
        await checkNotionConnection();
        console.log("🔍 Debug - Forced auth context update");

        localStorage.setItem("stepperCurrentStep", "3");
        console.log(
          "🔍 Debug - Forced step 3 to localStorage after Notion connection"
        );

        setTimeout(() => {
          router.push("/?step=3");
        }, 1000);
      } catch (error) {
        console.error("Error in callback:", error);
        setStatus("Error connecting to Notion");
        // Reset the flag on error so user can retry
        hasExecuted.current = false;
        setTimeout(() => router.push("/"), 2000);
      }
    };

    handleCallback();
  }, [
    router,
    searchParams,
    user,
    isAuthenticated,
    // Remove mutation dependencies to prevent infinite loop
  ]);

  // Show loading state for either mutation
  const isLoading =
    exchangeCodeMutation.isPending || saveNotionTokenMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Notion Authentication</h1>
        <p className="text-gray-600">{status}</p>
        {isLoading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}
