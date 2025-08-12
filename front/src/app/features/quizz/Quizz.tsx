import { useAuth } from "@/contexts/AuthContext";
import { useNotion } from "@/hooks/useNotion";
import React from "react";

const Quizz = () => {
  const { isAuthenticated, user } = useAuth();
  const {
    isConnected,
    isSavingToken,
    connectToNotion,
    databases,
    isLoadingDatabases,
    fetchDatabases,
    savedNotionDatabases,
    integrations,
  } = useNotion();

  console.log(isAuthenticated, user, savedNotionDatabases, integrations);

  return <div>Quizz</div>;
};

export default Quizz;
