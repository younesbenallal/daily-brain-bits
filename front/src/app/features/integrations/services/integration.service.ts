// API functions for integration services

export interface Integration {
  id: string;
  userId: string;
  type: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fetchUserIntegrations = async (
  userEmail: string
): Promise<Integration[]> => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/integrations/user/by-email?email=${encodeURIComponent(userEmail)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch user integrations");
  }

  return response.json();
};

export const fetchUserActiveIntegrations = async (
  userEmail: string
): Promise<Integration[]> => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/integrations/user/by-email/active?email=${encodeURIComponent(userEmail)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch active integrations");
  }

  return response.json();
};

export const fetchUserIntegrationByType = async (
  userEmail: string,
  type: string
): Promise<Integration | null> => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/integrations/user/by-email/type/${type}?email=${encodeURIComponent(
      userEmail
    )}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Pas d'intégration trouvée
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch integration by type");
  }

  return response.json();
};
