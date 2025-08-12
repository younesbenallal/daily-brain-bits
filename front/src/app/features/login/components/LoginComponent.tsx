"use client";
import React, { useState } from "react";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";
import Card from "@/app/components/card/Card";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SignUp from "./SignUp";
import { useAuth } from "@/contexts/AuthContext";

interface LoginComponentProps {
  onNext: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onNext }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (isSignUp) {
    return <SignUp onNext={onNext} />;
  }

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Email et mot de passe sont requis");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      console.log("✅ Login successful!");
      onNext();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Une erreur est survenue lors de la connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Welcome back"
      buttonLabel="Login"
      onButtonClick={handleLogin}
      buttonIcon={<ArrowForwardIosIcon fontSize="small" />}
      isLoading={loading}
    >
      <div className="mb-8">
        <p className="text-left text-gray-600 text-sm leading-relaxed">
          It allows Daily Brain Bits to send you your notes by email. We will
          send you some product updates as well.
        </p>
      </div>

      <div className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}

        <div>
          <input
            type="email"
            placeholder="real-email@no-tmp-email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-12)] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 mt-4 border border-gray-200 rounded-[var(--radius-12)]  focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <p className="text-center text-gray-600 text-sm leading-relaxed">
          Don't have an account?{" "}
          <span
            className="text-brand underline cursor-pointer"
            onClick={() => setIsSignUp(true)}
          >
            Sign up
          </span>
        </p>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-gray-500 text-sm">Or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
          >
            <GoogleIcon fontSize="small" />
            Login with Google
          </button>
          <button
            onClick={handleLogin}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
          >
            <AppleIcon fontSize="small" />
            Login with Apple
          </button>
        </div>
      </div>
    </Card>
  );
};

export default LoginComponent;
