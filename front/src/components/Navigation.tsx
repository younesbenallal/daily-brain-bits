"use client";

import React from "react";
import { useRouter_Custom } from "@/contexts/RouterContext";

const Navigation: React.FC = () => {
  const { currentRoute, navigateTo, routes } = useRouter_Custom();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 p-4">
      <div className="flex space-x-4">
        {routes.map((route) => (
          <button
            key={route.path}
            onClick={() => navigateTo(route.path)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentRoute === route.path
                ? "bg-blue-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {route.name}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
