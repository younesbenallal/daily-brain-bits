"use client";

import React, { useState } from "react";
import {
  testService,
  Integration,
  Database,
  TestSimulationResult,
} from "../services/test.service";
import ResultsExplanation from "./ResultsExplanation";

interface TestSimulationProps {
  integrations: Integration[];
  databases: Database[];
}

const TestSimulation: React.FC<TestSimulationProps> = ({
  integrations,
  databases,
}) => {
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [selectedDatabases, setSelectedDatabases] = useState<Database[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtrer les bases de données selon l'intégration sélectionnée
  const availableDatabases = databases.filter(
    (db) => !selectedIntegration || db.integrationId === selectedIntegration.id
  );

  const handleIntegrationChange = (integrationId: string) => {
    const integration =
      integrations.find((i) => i.id === integrationId) || null;
    setSelectedIntegration(integration);
    setSelectedDatabases([]); // Reset databases when integration changes
    setResults(null);
    setError(null);
  };

  const handleDatabaseToggle = (database: Database) => {
    setSelectedDatabases((prev) => {
      const isSelected = prev.some((db) => db.id === database.id);
      if (isSelected) {
        return prev.filter((db) => db.id !== database.id);
      } else {
        return [...prev, database];
      }
    });
  };

  const runSimulation = async () => {
    if (!selectedIntegration || selectedDatabases.length === 0) {
      setError(
        "Veuillez sélectionner une intégration et au moins une base de données"
      );
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const simulationResults = await testService.simulate3MonthsDailyUsage(
        selectedIntegration,
        selectedDatabases
      );
      setResults(simulationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsRunning(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Test de Simulation - 3 Mois d'Utilisation
        </h1>
        <p className="text-gray-600 mb-6">
          Simulez 90 jours d'utilisation quotidienne de votre système de
          répétition espacée
        </p>

        {/* Configuration */}
        <div className="space-y-4">
          {/* Sélection de l'intégration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intégration Notion
            </label>
            <select
              value={selectedIntegration?.id || ""}
              onChange={(e) => handleIntegrationChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionnez une intégration</option>
              {integrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sélection des bases de données */}
          {selectedIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bases de données ({selectedDatabases.length} sélectionnée(s))
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableDatabases.map((database) => (
                  <label
                    key={database.id}
                    className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDatabases.some(
                        (db) => db.id === database.id
                      )}
                      onChange={() => handleDatabaseToggle(database)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {database.databaseTitle}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Bouton de lancement */}
          <div className="pt-4">
            <button
              onClick={runSimulation}
              disabled={
                !selectedIntegration ||
                selectedDatabases.length === 0 ||
                isRunning
              }
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Simulation en cours...
                </span>
              ) : (
                "Lancer la simulation"
              )}
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Résultats */}
      {results && (
        <div className="space-y-6">
          {/* Explication des résultats */}
          <ResultsExplanation results={results} />

          {/* Résumé général */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Résultats de la Simulation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">
                  Total des cartes révisées
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {results.totalCardsReviewed}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Toutes révisions sur 90 jours
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">
                  Nouvelles cartes apprises
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {results.totalNewCards}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Cartes vues pour la 1ère fois
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">
                  Qualité moyenne
                </h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatNumber(results.averageQuality)}/5
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Performance globale
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">
                  Taux de rétention
                </h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatNumber(results.summary.retentionRate)}%
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Cartes bien mémorisées
                </p>
              </div>
            </div>

            {/* Statistiques supplémentaires */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Résumé de la simulation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cartes totales:</span>{" "}
                  {results.finalCards.length}
                </div>
                <div>
                  <span className="font-medium">Moyenne par jour:</span>{" "}
                  {formatNumber(results.summary.averageCardsPerDay)} cartes
                </div>
                <div>
                  <span className="font-medium">Révisions totales:</span>{" "}
                  {results.totalCardsReviewed} (incluant re-révisions)
                </div>
              </div>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Meilleur jour
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(results.summary.bestDay.date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Cartes révisées: {results.summary.bestDay.cardsReviewed}
                  </p>
                  <p className="text-sm text-gray-600">
                    Qualité moyenne:{" "}
                    {formatNumber(results.summary.bestDay.averageQuality)}/5
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Pire jour
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(results.summary.worstDay.date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Cartes révisées: {results.summary.worstDay.cardsReviewed}
                  </p>
                  <p className="text-sm text-gray-600">
                    Qualité moyenne:{" "}
                    {formatNumber(results.summary.worstDay.averageQuality)}/5
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Moyenne de cartes par jour:{" "}
                {formatNumber(results.summary.averageCardsPerDay)}
              </p>
            </div>
          </div>

          {/* Graphique des résultats quotidiens */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Progression quotidienne
            </h3>
            <div className="overflow-x-auto scrollbar-custom">
              <div className="min-w-full">
                <div className="grid grid-cols-10 gap-1 mb-4">
                  {results.dailyResults.slice(0, 30).map((day, index) => (
                    <div
                      key={index}
                      className="h-8 rounded-sm flex items-center justify-center text-xs text-white font-medium"
                      style={{
                        backgroundColor: `hsl(${Math.min(
                          day.averageQuality * 60,
                          120
                        )}, 70%, 50%)`,
                      }}
                      title={`${formatDate(day.date)}: ${
                        day.cardsReviewed
                      } cartes, qualité ${formatNumber(day.averageQuality)}`}
                    >
                      {day.cardsReviewed}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Affichage des 30 premiers jours - La couleur indique la
                  qualité moyenne (vert = bon, rouge = mauvais)
                </p>
              </div>
            </div>
          </div>

          {/* Détails des cartes finales */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              État final des cartes ({results.finalCards.length} cartes)
            </h3>
            <div className="overflow-x-auto scrollbar-custom">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base de données
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Répétitions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Facilité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prochaine révision
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.finalCards.slice(0, 20).map((card, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {card.title.length > 50
                          ? `${card.title.substring(0, 50)}...`
                          : card.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.databaseTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {card.repetition}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(card.easinessFactor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(card.nextReviewDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.finalCards.length > 20 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  ... et {results.finalCards.length - 20} autres cartes
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSimulation;
