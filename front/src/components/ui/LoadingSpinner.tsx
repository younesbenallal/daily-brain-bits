import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
}) => {
  const sizeClasses = {
    small: "h-6 w-6 border-b-1",
    medium: "h-12 w-12 border-b-2",
    large: "h-16 w-16 border-b-3",
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} border-brand`}
    ></div>
  );
};
