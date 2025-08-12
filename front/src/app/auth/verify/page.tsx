"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { refreshSession, isAuthenticated } = useAuth();

  useEffect(() => {
    // Rafraîchir la session quand on arrive sur cette page
    refreshSession();

    // Rediriger vers l'application après un court délai
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.push("/"); // Ou vers votre page principale
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [refreshSession, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Email vérifié !</h1>
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  );
}
