"use client";
import React from "react";
import LoginComponent from "../../login/components/LoginComponent";
import Preference from "../../login/components/Preference";
import NotesSource from "../../login/components/NotesSource";
import NotesSourceDetail from "../../login/components/NotesSourceDetail";
import ConfigureNotion from "../../login/components/ConfigureNotion";
import { useStepper } from "@/hooks/useStepper";
import { useAuth } from "@/contexts/AuthContext";
import LogoutIcon from "@mui/icons-material/Logout";
import GetAllNotes from "../../notion/components/GetAllNotes";
import TutorialNotion from "../../notion/components/TutorialNotion";

const STEPS = [
  { Component: LoginComponent, key: "step-1" },
  { Component: Preference, key: "step-2" },
  { Component: NotesSource, key: "step-3" },
  { Component: NotesSourceDetail, key: "step-4" },
  { Component: ConfigureNotion, key: "step-5" },
  { Component: GetAllNotes, key: "step-6" },
  { Component: TutorialNotion, key: "step-7" },
];

const Stepper: React.FC = () => {
  const { currentStep, nextStep, resetStepper } = useStepper(0, STEPS.length);
  const { logout, isAuthenticated, user } = useAuth();
  const CurrentComponent = STEPS[currentStep].Component;
  const handleLogout = () => {
    logout();
    resetStepper();
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <CurrentComponent key={STEPS[currentStep].key} onNext={nextStep} />

      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 flex gap-2">
          <button
            onClick={resetStepper}
            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Reset Flow
          </button>
          <button
            onClick={handleLogout}
            className={`px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
              isAuthenticated
                ? "bg-gray-500 text-white hover:bg-gray-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title={
              isAuthenticated ? `Déconnecter ${user?.email}` : "Non connecté"
            }
            disabled={!isAuthenticated}
          >
            <LogoutIcon fontSize="small" />
            Logout {isAuthenticated ? "✅" : "❌"}
          </button>
        </div>
      )}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm">
          Auth Status: {isAuthenticated ? "✅ Connecté" : "❌ Non connecté"}
          {user && (
            <div>
              User: {user.name} ({user.email})
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stepper;
