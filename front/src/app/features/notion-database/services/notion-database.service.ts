export const saveNotionDatabase = async ({
  databaseId,
  userEmail,
}: {
  databaseId: { id: string; label: string }[];
  userEmail: string;
}) => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/notion-database/save?email=${encodeURIComponent(userEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        databaseId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save Notion databases");
  }

  return response.json();
};

export const getUserNotionDatabases = async (userEmail: string) => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/notion-database/user?email=${encodeURIComponent(userEmail)}`,
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
    throw new Error(error.error || "Failed to fetch Notion databases");
  }

  return response.json();
};

export const deleteUserNotionDatabases = async (userEmail: string) => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/notion-database/user?email=${encodeURIComponent(userEmail)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete Notion databases");
  }

  return response.json();
};

export const fetchNotionDatabasesByIntegrationId = async (
  integrationId: string
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notion-database/integration/${integrationId}`,
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
    throw new Error(error.error || "Failed to fetch Notion databases");
  }
  return response.json();
};
