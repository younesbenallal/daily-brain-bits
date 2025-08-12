"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Types pour le routeur
export interface Route {
  path: string;
  component: React.ComponentType<any>;
  name: string;
}

interface RouterContextType {
  currentRoute: string;
  navigateTo: (path: string) => void;
  routes: Route[];
  getCurrentComponent: () => React.ComponentType<any> | null;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

interface RouterProviderProps {
  children: ReactNode;
  routes: Route[];
  defaultRoute?: string;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({
  children,
  routes,
  defaultRoute = "/",
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentRoute, setCurrentRoute] = useState<string>(defaultRoute);

  // Écouter les changements d'URL
  useEffect(() => {
    const route = searchParams.get("route") || defaultRoute;
    setCurrentRoute(route);
  }, [searchParams, defaultRoute]);

  const navigateTo = (path: string) => {
    setCurrentRoute(path);
    router.push(`?route=${path}`);
  };

  const getCurrentComponent = () => {
    const route = routes.find((r) => r.path === currentRoute);
    return route ? route.component : null;
  };

  const value: RouterContextType = {
    currentRoute,
    navigateTo,
    routes,
    getCurrentComponent,
  };

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
};

export const useRouter_Custom = () => {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error("useRouter_Custom must be used within a RouterProvider");
  }
  return context;
};
