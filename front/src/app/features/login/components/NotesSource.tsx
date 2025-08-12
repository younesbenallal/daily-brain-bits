import Card from "@/app/components/card/Card";
import React, { useState, useEffect, useRef } from "react";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotionIcon from "../../../../../public/notion.svg";
import ObsidianIcon from "../../../../../public/obsidian.svg";
import NotesSourceButton from "./NotesSourceButton";
import { useNotion } from "@/hooks/useNotion";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface NotesSourceProps {
  onNext?: () => void;
}

const NotesSource: React.FC<NotesSourceProps> = ({ onNext }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const hasLoadedInfo = useRef(false);
  const {
    notionData,
    workspaceName,
    workspaceEmail,
    isConnecting,
    connectToNotion,
    getNotionLabel,
    isConnected,
    isLoadingWorkspaceInfo,
    fetchWorkspaceInfo,
  } = useNotion();

  // Charger les informations de l'espace de travail au chargement du composant
  useEffect(() => {
    if (isConnected && !hasLoadedInfo.current && !isLoadingWorkspaceInfo) {
      console.log("🔍 Loading workspace info once");
      hasLoadedInfo.current = true;
      fetchWorkspaceInfo();
      setSelected("notion");
    }
  }, [isConnected, isLoadingWorkspaceInfo, fetchWorkspaceInfo]);

  const handleGoToApp = async () => {
    if (selected === "notion") {
      if (isConnected) {
        onNext?.();
      } else {
        try {
          await connectToNotion();
        } catch (error) {
          alert("Erreur lors de la connexion à Notion. Veuillez réessayer.");
        }
      }
    } else {
      onNext?.();
    }
  };

  const buttonLabel = () => {
    if (isConnecting) return "Connexion...";
    if (isConnected && selected === "notion") return "Go to app";
    return "Go to app";
  };

  // Fonction pour rafraîchir manuellement les informations
  const handleRefresh = () => {
    hasLoadedInfo.current = false;
    fetchWorkspaceInfo();
  };

  return (
    <Card
      title="Choose source"
      buttonLabel={buttonLabel()}
      onButtonClick={handleGoToApp}
      buttonIcon={<ArrowForwardIosIcon fontSize="small" />}
      isLoading={isConnecting || isLoadingWorkspaceInfo}
    >
      <p className="text-gray-light text-base mb-10">
        Give us a place to swallow your notes
      </p>
      <div className="flex flex-col gap-5 mb-10">
        <NotesSourceButton
          icon={NotionIcon}
          label={getNotionLabel()}
          selected={selected === "notion"}
          onClick={() => setSelected("notion")}
          disabled={isConnecting || isLoadingWorkspaceInfo}
        />
        <NotesSourceButton
          icon={ObsidianIcon}
          label="Obsidian"
          selected={selected === "obsidian"}
          disabled
          soon
        />
      </div>

      {isLoadingWorkspaceInfo && (
        <div className="flex items-center justify-center">
          <LoadingSpinner size="small" />
          <span className="ml-2 text-sm text-gray-600">
            Chargement des informations Notion...
          </span>
        </div>
      )}

      {isConnected && !isLoadingWorkspaceInfo && (
        <div className="space-y-2">
          <SuccessMessage
            message={`Connecté à ${workspaceName || "Notion"} (${
              workspaceEmail || ""
            })`}
          />
          <div className="text-right">
            <button
              onClick={handleRefresh}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default NotesSource;
