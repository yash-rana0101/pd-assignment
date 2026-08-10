import type { FieldMapping, InputData, PersonPayload } from "../types/mapping";

export const resolveInputValue = (
  data: InputData,
  path: string
): unknown => {
  const keys = path.split(".");

  let current: unknown = data;

  for (const key of keys) {
    // If current level is not an object or is null, the path is invalid
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
};


export const getNameFromMappings = (
  inputData: InputData,
  mappings: FieldMapping[]
): string => {
  const nameMapping = mappings.find((m) => m.pipedriveKey === "name");

  if (!nameMapping) {
    throw new Error(
      'No mapping found for pipedriveKey "name". ' +
      "A name mapping is required to search and create Pipedrive persons."
    );
  }

  const nameValue = resolveInputValue(inputData, nameMapping.inputKey);

  if (!nameValue || typeof nameValue !== "string" || nameValue.trim() === "") {
    throw new Error(
      `The "name" mapping points to inputKey "${nameMapping.inputKey}", ` +
      `but the resolved value is empty or not a string. Value: ${JSON.stringify(nameValue)}`
    );
  }

  return nameValue;
};


const formatContactField = (
  value: unknown,
  label: string = ""
): Array<{ value: string; primary: boolean; label: string }> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value).trim();

  if (stringValue === "") {
    return undefined;
  }

  return [{ value: stringValue, primary: true, label }];
};


export const buildPersonPayload = (
  inputData: InputData,
  mappings: FieldMapping[]
): PersonPayload => {
  const payload: PersonPayload = {};

  for (const mapping of mappings) {
    const { pipedriveKey, inputKey } = mapping;
    const value = resolveInputValue(inputData, inputKey);

    // Edge Case 1: Input path doesn't resolve — skip with warning
    if (value === undefined) {
      console.warn(
        `Mapping skipped: inputKey "${inputKey}" could not be resolved from inputData. ` +
        `PipedriveKey "${pipedriveKey}" will not be set.`
      );
      continue;
    }

    // Format email and phone fields in Pipedrive's expected structure
    if (pipedriveKey === "email") {
      const formatted = formatContactField(value, "work");
      if (formatted) {
        payload.email = formatted;
      }
      continue;
    }

    if (pipedriveKey === "phone") {
      const formatted = formatContactField(value, "home");
      if (formatted) {
        payload.phone = formatted;
      }
      continue;
    }

    // For all other fields, assign the raw value
    payload[pipedriveKey] = value;
  }

  return payload;
};
