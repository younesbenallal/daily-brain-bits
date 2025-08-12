import { useMutation } from "@tanstack/react-query";
import { resendEmail } from "./login.service";

// React Query hook
export const useResendEmail = () => {
  return useMutation({
    mutationFn: resendEmail,
    onSuccess: () => {
      alert("Email de vérification renvoyé !");
    },
    onError: (error) => {
      console.error("Error resending email:", error);
    },
  });
};
