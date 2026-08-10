import type { PipedrivePerson } from "../types/pipedrive";
import type {
  PipedriveApiResponse,
  PipedriveSearchData,
  PersonPayload,
} from "../types/mapping";


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

/** Validates that required environment variables are present */
const getConfig = (): { apiKey: string; baseUrl: string } => {
  const apiKey = process.env.PIPEDRIVE_API_KEY;
  const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

  if (!apiKey) {
    throw new Error(
      "PIPEDRIVE_API_KEY is not set. Please add it to your .env file."
    );
  }

  if (!companyDomain) {
    throw new Error(
      "PIPEDRIVE_COMPANY_DOMAIN is not set. Please add it to your .env file."
    );
  }

  return {
    apiKey,
    baseUrl: `https://${companyDomain}.pipedrive.com`,
  };
};

const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PipedriveApiResponse<T>> => {
  const { apiKey, baseUrl } = getConfig();

  // Append api_token to the URL
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${baseUrl}${endpoint}${separator}api_token=${apiKey}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });
  } catch (networkError) {
    // Edge Case 3: Network failure — provide actionable error message
    throw new PipedriveApiError(
      `Network error while calling ${endpoint}: ${(networkError as Error).message}. ` +
      "Please check your internet connection and PIPEDRIVE_COMPANY_DOMAIN.",
      0,
      endpoint
    );
  }

  // Handle specific HTTP error statuses
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body");

    switch (response.status) {
      case 401:
        throw new PipedriveApiError(
          "Authentication failed. Please verify your PIPEDRIVE_API_KEY is correct and active.",
          401,
          endpoint
        );
      case 404:
        throw new PipedriveApiError(
          `Endpoint not found: ${endpoint}. Please verify your PIPEDRIVE_COMPANY_DOMAIN.`,
          404,
          endpoint
        );
      case 429:
        // Edge Case 3: Rate limiting
        throw new PipedriveApiError(
          "Rate limit exceeded. Pipedrive API allows limited requests per second. " +
          "Please wait a moment and try again.",
          429,
          endpoint
        );
      default:
        throw new PipedriveApiError(
          `API error (${response.status}): ${errorBody}`,
          response.status,
          endpoint
        );
    }
  }

  return response.json() as Promise<PipedriveApiResponse<T>>;
};

export const searchPersonByName = async (
  name: string
): Promise<number | null> => {
  console.log(` Searching for person with name: "${name}"...`);

  const encodedName = encodeURIComponent(name);
  const endpoint = `/api/v1/persons/search?term=${encodedName}&exact_match=true&fields=name`;

  const result = await makeRequest<PipedriveSearchData>(endpoint);

  if (!result.success || !result.data) {
    console.log("   No results returned from search.");
    return null;
  }

  const items = result.data.items;

  if (!items || items.length === 0) {
    console.log(`   No person found with name "${name}".`);
    return null;
  }

  const personId = items[0].item.id;
  console.log(` Found existing person with ID: ${personId}`);

  return personId;
};

export const createPerson = async (
  payload: PersonPayload
): Promise<PipedrivePerson> => {
  console.log(" Creating new Pipedrive person...");

  const result = await makeRequest<PipedrivePerson>("/api/v1/persons", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    throw new Error(
      `Failed to create person. API response: ${JSON.stringify(result)}`
    );
  }

  console.log(` Person created with ID: ${result.data.id}`);
  return result.data;
};

export const updatePerson = async (
  id: number,
  payload: PersonPayload
): Promise<PipedrivePerson> => {
  console.log(`  Updating Pipedrive person (ID: ${id})...`);

  const result = await makeRequest<PipedrivePerson>(`/api/v1/persons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!result.success || !result.data) {
    throw new Error(
      `Failed to update person ${id}. API response: ${JSON.stringify(result)}`
    );
  }

  console.log(` Person updated successfully (ID: ${result.data.id})`);
  return result.data;
};
