export type NotionTokenResponse = {
  access_token: string;
  refresh_token: string;
  bot_id: string;
  duplicated_template_id?: string | null;
  owner?: unknown;
  workspace_icon?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
};

type NotionAuthorizeParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  owner?: "workspace" | "user";
};

export function getNotionAuthorizeUrl(params: NotionAuthorizeParams): string {
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  if (params.owner) {
    url.searchParams.set("owner", params.owner);
  }
  return url.toString();
}

type ExchangeNotionCodeParams = {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export async function exchangeNotionCode(params: ExchangeNotionCodeParams): Promise<NotionTokenResponse> {
  const encoded = Buffer.from(`${params.clientId}:${params.clientSecret}`, "utf8").toString("base64");
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`notion_token_exchange_failed:${response.status}:${errorBody}`);
  }

  return (await response.json()) as NotionTokenResponse;
}
