import type { PipedrivePerson } from "../types/pipedrive";
import type { ApiResponse, SearchResult, PersonPayload } from "../types/mapping";

export class PipedriveApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "PipedriveApiError";
  }
}

function getConfig() {
  const apiKey = process.env.PIPEDRIVE_API_KEY;
  const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

  if (!apiKey) throw new Error("PIPEDRIVE_API_KEY is not set in .env");
  if (!domain) throw new Error("PIPEDRIVE_COMPANY_DOMAIN is not set in .env");

  return { apiKey, baseUrl: `https://${domain}.pipedrive.com` };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const { apiKey, baseUrl } = getConfig();
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${baseUrl}${endpoint}${sep}api_token=${apiKey}`;

  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...options.headers },
    });
  } catch (err) {
    throw new PipedriveApiError(
      `Network error on ${endpoint}: ${(err as Error).message}`,
      0,
      endpoint
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "Could not read error body");

    if (res.status === 401) {
      throw new PipedriveApiError("Authentication failed. Check your PIPEDRIVE_API_KEY.", 401, endpoint);
    }
    if (res.status === 404) {
      throw new PipedriveApiError(`Endpoint not found: ${endpoint}. Check PIPEDRIVE_COMPANY_DOMAIN.`, 404, endpoint);
    }
    if (res.status === 429) {
      throw new PipedriveApiError("Rate limit exceeded. Wait a moment and try again.", 429, endpoint);
    }
    throw new PipedriveApiError(`API error (${res.status}): ${body}`, res.status, endpoint);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export async function searchPersonByName(name: string): Promise<number | null> {
  console.log(`Searching for person: "${name}"...`);

  const term = encodeURIComponent(name);
  const result = await request<SearchResult>(`/api/v1/persons/search?term=${term}&exact_match=true&fields=name`);

  if (!result.success || !result.data) {
    console.log("  No results from search.");
    return null;
  }

  const { items } = result.data;

  if (!items || items.length === 0) {
    console.log(`  No person found with name "${name}".`);
    return null;
  }

  const id = items[0].item.id;
  console.log(`  Found existing person (ID: ${id})`);
  return id;
}

export async function createPerson(payload: PersonPayload): Promise<PipedrivePerson> {
  console.log("Creating new person...");

  const result = await request<PipedrivePerson>("/api/v1/persons", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to create person: ${JSON.stringify(result)}`);
  }

  console.log(`  Created person (ID: ${result.data.id})`);
  return result.data;
}

export async function updatePerson(id: number, payload: PersonPayload): Promise<PipedrivePerson> {
  console.log(`Updating person (ID: ${id})...`);

  const result = await request<PipedrivePerson>(`/api/v1/persons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to update person ${id}: ${JSON.stringify(result)}`);
  }

  console.log(`  Updated person (ID: ${result.data.id})`);
  return result.data;
}
