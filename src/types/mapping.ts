export interface FieldMapping {
  pipedriveKey: string;
  inputKey: string;
}

export type InputData = Record<string, unknown>;

export interface PersonPayload {
  name?: string;
  email?: { value: string; primary: boolean; label: string }[];
  phone?: { value: string; primary: boolean; label: string }[];
  [key: string]: unknown;
}

export interface ApiResponse<T> {
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

export interface SearchResult {
  items: {
    result_score: number;
    item: {
      id: number;
      name: string;
      type: string;
      phones: string[];
      emails: string[];
      visible_to: number;
      organization?: { id: number; name: string } | null;
      custom_fields: string[];
      notes: string[];
    };
  }[];
}
