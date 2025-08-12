import React from "react";
import Image from "next/image";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

interface NotesSourceButtonProps {
  icon: any;
  label: string;
  selected: boolean;
  onClick?: () => void;
  disabled?: boolean;
  soon?: boolean;
}

const NotesSourceButton: React.FC<NotesSourceButtonProps> = ({
  icon,
  label,
  selected,
  onClick,
  disabled = false,
  soon = false,
}) => (
  <button
    type="button"
    className={`flex items-center justify-between px-8 py-4 border rounded-[var(--radius-12)] text-lg font-medium w-full
      ${
        selected
          ? "selected-source"
          : "border-input bg-white hover:border-[var(--brand)]"
      }
      ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
    `}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={
      selected
        ? {
            borderColor: "var(--brand)",
            background: "rgba(241,104,145,0.08)",
            color: "var(--brand)",
          }
        : {}
    }
  >
    <span className="flex items-center gap-3 text-sm">
      <Image src={icon} alt={label} width={24} height={24} />
      {label}
    </span>
    {soon ? (
      <span className="flex items-center gap-1">
        <HourglassEmptyIcon fontSize="small" />
        <span className="bg-gray-300 text-xs px-2 py-0.5 rounded ml-1">
          Soon
        </span>
      </span>
    ) : (
      selected && (
        <CheckCircleIcon style={{ color: "var(--brand)" }} fontSize="small" />
      )
    )}
  </button>
);

export default NotesSourceButton;
