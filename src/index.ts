import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import type { FieldMapping, InputData } from "./types/mapping";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";
import { buildPayload, extractName } from "./utils/mapping.utils";
import { searchPersonByName, createPerson, updatePerson, PipedriveApiError } from "./services/pipedrive.service";

dotenv.config();

/*
  syncPdPerson — main sync flow:
  1. Extract person name from inputData via the "name" mapping
  2. Build the API payload from all field mappings
  3. Search Pipedrive for an existing person with that name
  4. If found → update, otherwise → create
  5. Return the Pipedrive person
*/
const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    const data = inputData as InputData;
    const fields = mappings as FieldMapping[];

    const name = extractName(data, fields);
    console.log(`\nPerson name: "${name}"`);

    const payload = buildPayload(data, fields);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const existingId = await searchPersonByName(name);

    let person: PipedrivePerson;

    if (existingId !== null) {
      person = await updatePerson(existingId, payload);
    } else {
      person = await createPerson(payload);
    }

    console.log("\nSync complete! Person:");
    console.log(JSON.stringify(person, null, 2));

    return person;
  } catch (error) {
    if (error instanceof PipedriveApiError) {
      console.error(`\nPipedrive API Error [${error.statusCode}] at ${error.endpoint}: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
    } else {
      console.error("\nUnexpected error:", error);
    }
    throw error;
  }
};

syncPdPerson()
  .then(() => console.log("\nDone."))
  .catch(() => process.exit(1));
