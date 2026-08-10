import type { FieldMapping, InputData, PersonPayload } from "../types/mapping";

// Walks a dot-separated path like "phoneNumber.home" through a nested object
export function getValueByPath(data: InputData, path: string): unknown {
  let current: unknown = data;

  for (const key of path.split(".")) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// Extracts the person name using whichever mapping points to "name"
export function extractName(data: InputData, mappings: FieldMapping[]): string {
  const nameMapping = mappings.find((m) => m.pipedriveKey === "name");

  if (!nameMapping) {
    throw new Error('No mapping found for "name" — it is required to search/create persons.');
  }

  const name = getValueByPath(data, nameMapping.inputKey);

  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error(
      `"name" mapping points to "${nameMapping.inputKey}" but resolved to: ${JSON.stringify(name)}`
    );
  }

  return name;
}

// Wraps a raw value into Pipedrive's contact info format: [{ value, primary, label }]
function toContactArray(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;

  const str = String(value).trim();
  if (!str) return undefined;

  return [{ value: str, primary: true, label }];
}

// Builds the person payload from inputData using the field mappings
export function buildPayload(data: InputData, mappings: FieldMapping[]): PersonPayload {
  const payload: PersonPayload = {};

  for (const { pipedriveKey, inputKey } of mappings) {
    const value = getValueByPath(data, inputKey);

    if (value === undefined) {
      console.warn(`Mapping skipped: "${inputKey}" not found in inputData. "${pipedriveKey}" won't be set.`);
      continue;
    }

    // email and phone need Pipedrive's array format
    if (pipedriveKey === "email") {
      const formatted = toContactArray(value, "work");
      if (formatted) payload.email = formatted;
      continue;
    }

    if (pipedriveKey === "phone") {
      const formatted = toContactArray(value, "home");
      if (formatted) payload.phone = formatted;
      continue;
    }

    payload[pipedriveKey] = value;
  }

  return payload;
}
