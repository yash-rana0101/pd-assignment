export interface FieldMapping {
  pipedriveKey: string;
  inputKey: string;
}

/** Flexible input data type — supports nested objects */
export type InputData = Record<string, unknown>;

/** Payload sent to Pipedrive when creating or updating a person */
export interface PersonPayload {
  name?: string;
  email?: Array<{ value: string; primary: boolean; label: string }>;
  phone?: Array<{ value: string; primary: boolean; label: string }>;
  [key: string]: unknown;
}

/** Generic wrapper for Pipedrive API v1 responses */
export interface PipedriveApiResponse<T> {
  success: boolean;
  data: T | null;
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
    };
  };
  error?: string;
  error_info?: string;
}

/** A single item from Pipedrive search results */
export interface PipedriveSearchItem {
  result_score: number;
  item: {
    id: number;
    name: string;
    type: string;
    phones: string[];
    emails: string[];
    visible_to: number;
    organization?: {
      id: number;
      name: string;
    } | null;
    custom_fields: string[];
    notes: string[];
  };
}

/** Wrapper for Pipedrive search response data */
export interface PipedriveSearchData {
  items: PipedriveSearchItem[];
}
