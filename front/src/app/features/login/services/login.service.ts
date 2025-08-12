// API function
export const resendEmail = async (formData: { email: string }) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-verification-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email: formData.email }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to resend verification email");
  }

  return response.json();
};
