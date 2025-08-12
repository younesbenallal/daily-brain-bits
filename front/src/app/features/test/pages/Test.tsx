"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import TestSimulation from "../components/TestSimulation";
import { Integration, Database } from "../services/test.service";
import { useNotion } from "@/hooks/useNotion";

const Test: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    isConnected,
    notionIntegration,
    savedNotionDatabases,
    isLoadingNotionIntegration,
    isLoadingSavedNotionDatabases,
    connectToNotion,
    fetchNotionIntegration,
    fetchSavedNotionDatabases,
  } = useNotion();

  useEffect(() => {
    // Convertir les données du hook useNotion au format attendu par TestSimulation
    if (notionIntegration) {
      // Créer une intégration au format attendu
      const integration: Integration = {
        id: notionIntegration.id,
        userId: user?.id || "",
        type: notionIntegration.type,
        name: notionIntegration.name,
        accessToken: notionIntegration.accessToken,
        refreshToken: notionIntegration.refreshToken || null,
        expiresAt: notionIntegration.expiresAt || null,
        metadata: notionIntegration.metadata || {},
        isActive: notionIntegration.isActive,
        createdAt: notionIntegration.createdAt,
        updatedAt: notionIntegration.updatedAt,
      };
      setIntegrations([integration]);
    } else {
      setIntegrations([]);
    }

    // Convertir les bases de données sauvegardées au format attendu
    if (savedNotionDatabases && savedNotionDatabases.length > 0) {
      const formattedDatabases: Database[] = savedNotionDatabases.map(
        (db: any) => ({
          id: db.id,
          integrationId: db.integrationId,
          databaseId: db.databaseId,
          databaseTitle: db.databaseTitle,
          createdAt: db.createdAt,
          updatedAt: db.updatedAt,
        })
      );
      setDatabases(formattedDatabases);
    } else {
      setDatabases([]);
    }
  }, [notionIntegration, savedNotionDatabases, user]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Veuillez vous connecter pour accéder au test de simulation.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingNotionIntegration || isLoadingSavedNotionDatabases) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données Notion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || integrations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Connexion Notion requise
          </h2>
          <p className="text-gray-600 mb-6">
            Pour utiliser le test de simulation, vous devez d'abord connecter
            votre compte Notion et sélectionner des bases de données dans la
            section Configuration.
          </p>
          <button
            onClick={connectToNotion}
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Connecter à Notion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TestSimulation integrations={integrations} databases={databases} />
    </div>
  );
};

export default Test;
