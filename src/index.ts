import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import type { FieldMapping, InputData } from "./types/mapping";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";
import { buildPersonPayload, getNameFromMappings } from "./utils/mapping.utils";
import { searchPersonByName, createPerson, updatePerson, PipedriveApiError } from "./services/pipedrive.service";

// Load environment variables from .env file
dotenv.config();

const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    const typedInputData = inputData as InputData;
    const typedMappings = mappings as FieldMapping[];

    // Step 1: Extract the person name from inputData using the "name" mapping
    // Edge Case 2: Throws if no "name" mapping exists
    const personName = getNameFromMappings(typedInputData, typedMappings);
    console.log(`\n Person name resolved from inputData: "${personName}"`);

    // Step 2: Build the API payload by applying all field mappings
    // Edge Case 1: Unresolvable paths are skipped with warnings
    const payload = buildPersonPayload(typedInputData, typedMappings);
    console.log(" Payload built:", JSON.stringify(payload, null, 2));

    // Step 3: Search for existing person by name
    const existingPersonId = await searchPersonByName(personName);

    let person: PipedrivePerson;

    if (existingPersonId !== null) {
      // Step 4a: Person exists — update
      person = await updatePerson(existingPersonId, payload);
    } else {
      // Step 4b: Person not found — create
      person = await createPerson(payload);
    }

    // Step 5: Log and return the resulting person
    console.log("\n Sync complete! Pipedrive Person:");
    console.log(JSON.stringify(person, null, 2));

    return person;
  } catch (error) {
    // Edge Case 3: Specific API error handling
    if (error instanceof PipedriveApiError) {
      console.error(
        `\n Pipedrive API Error [${error.statusCode}] at ${error.endpoint}:`
      );
      console.error(`   ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`\n Error: ${error.message}`);
    } else {
      console.error("\n An unexpected error occurred:", error);
    }
    throw error;
  }
};

// Execute the sync
syncPdPerson()
  .then((person) => {
    console.log("\n syncPdPerson() returned successfully.");
  })
  .catch(() => {
    process.exit(1);
  });
