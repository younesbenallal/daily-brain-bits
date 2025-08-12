// front/src/app/components/ui/Card.tsx
import React from "react";

export interface CardProps {
  title: string;
  children: React.ReactNode;
  buttonLabel?: string;
  onButtonClick?: () => void;
  buttonIcon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  buttonDisabled?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  buttonLabel,
  onButtonClick,
  buttonIcon,
  className = "",
  isLoading = false,
  buttonDisabled = false,
}) => (
  <div
    className={`flex flex-col justify-center h-full w-full max-w-md mx-auto bg-white rounded-[var(--radius-12)] p-8 shadow-lg ${className}`}
  >
    <h1 className="text-3xl font-bold text-left text-red-dark mb-2">{title}</h1>
    <div className="flex-1">{children}</div>
    {buttonLabel && onButtonClick && (
      <div className="flex justify-end mt-8">
        <button
          onClick={onButtonClick}
          disabled={isLoading || buttonDisabled}
          className={`flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-[var(--radius-12)] font-medium text-base hover:bg-[#e04b8a] transition-all shadow ${
            isLoading || buttonDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {buttonLabel}
          {buttonIcon}
        </button>
      </div>
    )}
  </div>
);

export default Card;
