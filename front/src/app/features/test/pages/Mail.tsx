import { useAuth } from "@/contexts/AuthContext";
import { useNotion } from "@/hooks/useNotion";
import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { TestService } from "../services/test.service";
import type { Integration } from "../services/test.service";

const Mail = () => {
  const { user } = useAuth();
  const { notionIntegration, savedNotionDatabases } = useNotion();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSendEmail = async () => {
    if (!user?.email) {
      setMessage({ type: "error", text: "Email utilisateur manquant" });
      return;
    }

    if (!notionIntegration) {
      setMessage({ type: "error", text: "Intégration Notion manquante" });
      return;
    }

    if (!savedNotionDatabases || savedNotionDatabases.length === 0) {
      setMessage({
        type: "error",
        text: "Aucune base de données Notion configurée",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const testService = new TestService();
      const result = await testService.sendNotesByMail(
        notionIntegration as Integration,
        savedNotionDatabases,
        user.email
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: `Email envoyé avec succès ! Page: "${result.data.page.pageTitle}"`,
        });
      } else {
        setMessage({ type: "error", text: "Échec de l'envoi de l'email" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur lors de l'envoi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>📧 Daily Brain Bit</h2>

      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <p>
          <strong>👤 Utilisateur:</strong> {user?.email}
        </p>
        <p>
          <strong>🔗 Intégration:</strong> {notionIntegration?.name}
        </p>
        <p>
          <strong>📊 Bases de données:</strong>{" "}
          {savedNotionDatabases?.length || 0}
        </p>
      </div>

      {message && (
        <Alert
          severity={message.type}
          style={{ marginBottom: "20px" }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleSendEmail}
        disabled={
          isLoading ||
          !user?.email ||
          !notionIntegration ||
          !savedNotionDatabases?.length
        }
        startIcon={
          isLoading ? <CircularProgress size={20} color="inherit" /> : null
        }
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          minWidth: "200px",
        }}
      >
        {isLoading ? "Envoi en cours..." : "📧 Envoyer une page aléatoire"}
      </Button>

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>
          💡 <strong>Comment ça marche :</strong>
        </p>
        <ul>
          <li>
            Une page est sélectionnée aléatoirement parmi vos bases de données
            Notion
          </li>
          <li>Un email formaté est envoyé à votre adresse</li>
          <li>L'email contient le titre, la date et un lien vers la page</li>
        </ul>
      </div>
    </div>
  );
};

export default Mail;
