// API functions for Notion services

export const fetchWorkspaceInfo = async (email: string) => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/notion/workspace-info?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch workspace info");
  }

  return response.json();
};

export const fetchDatabases = async (email: string) => {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/notion/databases?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch databases");
  }

  const data = await response.json();
  if (data.success && Array.isArray(data.databases)) {
    return data.databases;
  } else {
    throw new Error("Invalid database response format");
  }
};

export const saveNotionToken = async ({
  notionToken,
  userEmail,
  metadata,
  integrationName,
}: {
  notionToken: string;
  userEmail: string;
  metadata?: Record<string, unknown>;
  integrationName?: string;
}) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/notion`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        notionToken,
        userEmail,
        metadata,
        integrationName,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save Notion token: ${errorText}`);
  }

  return response.json();
};

export const getNotionAuthUrl = async () => {
  const response = await fetch("http://localhost:3001/notion/auth-url");

  if (!response.ok) {
    throw new Error("Failed to retrieve authentication URL");
  }

  return response.json();
};

// Add this function to exchange the authorization code for a token
export const exchangeCodeForToken = async ({
  code,
  state,
}: {
  code: string;
  state: string | null;
}) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notion/exchange-code?code=${code}&state=${state}`
  );

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
};

export const fetchAllNotes = async (
  integrationId: string,
  databaseIds: string[]
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notion-page/all-notes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ integrationId, databaseIds }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch all notes");
  }

  return response.json();
};
