import React from "react";

interface SuccessMessageProps {
  message: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => (
  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-green-800 text-sm">✅ {message}</p>
  </div>
);
