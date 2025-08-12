"use client";

import React from "react";
import { TestSimulationResult } from "../services/test.service";

interface ResultsExplanationProps {
  results: TestSimulationResult;
}

const ResultsExplanation: React.FC<ResultsExplanationProps> = ({ results }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
        <span className="text-2xl mr-2">💡</span>
        Explication des résultats
      </h3>

      <div className="space-y-4 text-sm text-blue-800">
        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">
            📊 Total des cartes révisées ({results.totalCardsReviewed})
          </h4>
          <p>
            C'est le nombre total de révisions effectuées sur 90 jours. Une même
            carte peut être révisée plusieurs fois, donc ce nombre peut être
            supérieur au nombre de cartes uniques.
          </p>
          <p className="mt-2 text-blue-600">
            <strong>Exemple :</strong> Si vous avez 50 cartes et que chacune est
            révisée 8 fois en moyenne, vous obtenez 400 révisions totales.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">
            🆕 Nouvelles cartes apprises ({results.totalNewCards})
          </h4>
          <p>
            C'est le nombre de cartes que vous avez vues pour la première fois
            pendant la simulation. Ces cartes passent de "jamais vue" à "vue au
            moins une fois".
          </p>
          <p className="mt-2 text-blue-600">
            <strong>Note :</strong> Dans un système de répétition espacée réel,
            vous introduisez progressivement de nouvelles cartes (2-3 par jour)
            pour ne pas surcharger votre mémoire.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">
            ⭐ Qualité moyenne ({results.averageQuality.toFixed(2)}/5)
          </h4>
          <p>
            C'est votre performance moyenne sur toutes les révisions. L'échelle
            va de 1 (très difficile) à 5 (très facile).
          </p>
          <div className="mt-2 space-y-1">
            <p>
              <strong>5 :</strong> Réponse parfaite, facile
            </p>
            <p>
              <strong>4 :</strong> Réponse correcte après hésitation
            </p>
            <p>
              <strong>3 :</strong> Réponse correcte mais difficile
            </p>
            <p>
              <strong>2 :</strong> Réponse incorrecte mais familière
            </p>
            <p>
              <strong>1 :</strong> Réponse complètement incorrecte
            </p>
          </div>
          <p className="mt-2 text-blue-600">
            <strong>Interprétation :</strong> 3.8/5 est une bonne performance !
            Cela indique que vous maîtrisez bien la majorité de vos cartes.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">
            🎯 Taux de rétention ({results.summary.retentionRate.toFixed(1)}%)
          </h4>
          <p>
            C'est le pourcentage de cartes que vous avez bien mémorisées
            (facteur de facilité ≥ 2.5). Plus ce taux est élevé, mieux vous
            retenez l'information.
          </p>
          <div className="mt-2">
            <p>
              <strong>Interprétation des taux :</strong>
            </p>
            <p>• 80-100% : Excellent</p>
            <p>• 60-80% : Très bon</p>
            <p>• 40-60% : Bon</p>
            <p>• 20-40% : À améliorer</p>
            <p>• 0-20% : Difficile</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">📈 Progression dans le temps</h4>
          <p>Le système de répétition espacée fonctionne ainsi :</p>
          <ol className="mt-2 list-decimal list-inside space-y-1">
            <li>
              <strong>Jour 1 :</strong> Vous apprenez une nouvelle carte
            </li>
            <li>
              <strong>Jour 2 :</strong> Première révision (intervalle : 1 jour)
            </li>
            <li>
              <strong>Jour 8 :</strong> Deuxième révision (intervalle : 6 jours)
            </li>
            <li>
              <strong>Jour 23 :</strong> Troisième révision (intervalle : 15
              jours)
            </li>
            <li>
              <strong>Et ainsi de suite...</strong> Les intervalles s'allongent
            </li>
          </ol>
          <p className="mt-2 text-blue-600">
            <strong>Résultat :</strong> Au début, vous avez beaucoup de
            révisions. Puis ça diminue car les cartes bien apprises ont des
            intervalles plus longs.
          </p>
        </div>

        <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">
            🚀 Conseils pour améliorer vos résultats
          </h4>
          <ul className="text-yellow-700 space-y-1 list-disc list-inside">
            <li>Limitez-vous à 2-3 nouvelles cartes par jour maximum</li>
            <li>Soyez honnête dans vos évaluations (1-5)</li>
            <li>Révisez quotidiennement, même si c'est peu</li>
            <li>
              Les cartes difficiles reviendront plus souvent, c'est normal !
            </li>
            <li>Patience : les bénéfices se voient sur le long terme</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResultsExplanation;
