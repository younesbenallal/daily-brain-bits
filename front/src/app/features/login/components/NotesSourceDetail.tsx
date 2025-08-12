import Card from "@/app/components/card/Card";
import React, { useState } from "react";
import NotionIcon from "../../../../../public/notion.svg";
import ObsidianIcon from "../../../../../public/obsidian.svg";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotesSourceButton from "./NotesSourceButton";
import { useNotion } from "@/hooks/useNotion";

interface NotesSourceDetailProps {
  onNext?: () => void;
}

const NotesSourceDetail: React.FC<NotesSourceDetailProps> = ({ onNext }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const { notionData, getNotionLabel, isConnected } = useNotion();

  React.useEffect(() => {
    if (isConnected) {
      setSelected("notion");
    }
  }, [isConnected]);

  return (
    <Card
      title="Choose source"
      buttonLabel="Next"
      onButtonClick={onNext}
      buttonIcon={<ArrowForwardIosIcon fontSize="small" />}
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
        />
        <NotesSourceButton
          icon={ObsidianIcon}
          label="Connected to Sam's Vault"
          selected={selected === "obsidian"}
          disabled
          soon
        />
      </div>
    </Card>
  );
};

export default NotesSourceDetail;
