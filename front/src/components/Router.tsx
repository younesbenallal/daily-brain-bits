"use client";

import React from "react";
import { useRouter_Custom } from "@/contexts/RouterContext";

const Router: React.FC = () => {
  const { getCurrentComponent } = useRouter_Custom();

  const CurrentComponent = getCurrentComponent();

  if (!CurrentComponent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Page non trouvée
          </h2>
          <p className="text-gray-600">La route demandée n'existe pas.</p>
        </div>
      </div>
    );
  }

  return <CurrentComponent />;
};

export default Router;
