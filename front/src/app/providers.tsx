"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouterProvider, Route } from "@/contexts/RouterContext";

// Import des composants pour les routes
import Login from "./features/login/pages/Login";
import Stepper from "./features/stepper/pages/Stepper";
import Quizz from "./features/quizz/Quizz";
import Test from "./features/test/pages/Test";
import Mail from "./features/test/pages/Mail";

// Définition des routes
const routes: Route[] = [
  { path: "/", component: Login, name: "Accueil" },
  { path: "/login", component: Login, name: "Connexion" },
  { path: "/stepper", component: Stepper, name: "Configuration" },
  { path: "/quizz", component: Quizz, name: "Quiz" },
  { path: "/test", component: Test, name: "Test Simulation" },
  { path: "/mail", component: Mail, name: "Mail" },
];

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider routes={routes} defaultRoute="/">
          {children}
        </RouterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
