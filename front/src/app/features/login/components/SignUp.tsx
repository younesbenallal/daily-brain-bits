import React, { useState } from "react";
import Card from "@/app/components/card/Card";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "@/contexts/AuthContext";
import { useResendEmail } from "../services/loginMutations";

interface SignUpProps {
  onNext?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onNext }) => {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const { register, refreshSession, isAuthenticated } = useAuth();
  const resendEmailMutation = useResendEmail();

  React.useEffect(() => {
    if (isAuthenticated && emailSent) {
      if (onNext) onNext();
    }
  }, [isAuthenticated, emailSent, onNext]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignUp = async () => {
    setError("");

    if (!formData.email || !formData.name || !formData.password) {
      setError("Tous les champs sont requis");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name);
      setEmailSent(true);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Une erreur est survenue lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setCheckingVerification(true);
    try {
      console.log("🔍 Checking verification status...");
      refreshSession();

      // Attendre un peu pour que la session se rafraîchisse
      setTimeout(() => {
        setCheckingVerification(false);
      }, 2000);
    } catch (error) {
      console.error("Error checking verification:", error);
      setCheckingVerification(false);
    }
  };

  if (emailSent) {
    return (
      <Card
        title="Vérifiez votre email"
        buttonLabel="Vérifier maintenant"
        onButtonClick={checkVerification}
        buttonIcon={
          checkingVerification ? (
            <RefreshIcon className="animate-spin" fontSize="small" />
          ) : (
            <RefreshIcon fontSize="small" />
          )
        }
        isLoading={checkingVerification}
      >
        <div className="text-center space-y-4">
          <div className="text-6xl">📧</div>
          <p className="text-gray-600">
            Un email de vérification a été envoyé à{" "}
            <strong>{formData.email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Cliquez sur le lien dans l'email, puis cliquez sur "Vérifier
            maintenant" ci-dessous.
          </p>
          <div className="pt-4">
            <button
              onClick={() =>
                resendEmailMutation.mutate({ email: formData.email })
              }
              className="text-brand underline text-sm hover:no-underline"
              disabled={resendEmailMutation.isPending}
            >
              {resendEmailMutation.isPending
                ? "Envoi en cours..."
                : "Renvoyer l'email"}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Create your account"
      buttonLabel="Sign Up"
      onButtonClick={handleSignUp}
      buttonIcon={<ArrowForwardIosIcon fontSize="small" />}
      isLoading={loading}
    >
      <div className="flex flex-col gap-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name"
            className="w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-12)] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-12)] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
          />
        </div>
        <div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-12)] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
          />
        </div>
        <div>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            className="w-full px-4 py-3 border border-gray-200 rounded-[var(--radius-12)] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
          />
        </div>
      </div>
    </Card>
  );
};

export default SignUp;
