# Pipedrive Data Synchronization

A TypeScript script that syncs person data from a local JSON file to Pipedrive CRM using field mappings and the Pipedrive API v1.

## How It Works

```
inputData.json  ──→  Apply mappings.json  ──→  Search Pipedrive by name
                                                       │
                                            ┌──────────┴──────────┐
                                            │                     │
                                       Found?                Not Found?
                                            │                     │
                                      Update Person         Create Person
                                            │                     │
                                            └──────────┬──────────┘
                                                       │
                                              Return Pipedrive Person
```

1. Reads person data from `inputData.json`
2. Applies field mappings from `mappings.json` to build a Pipedrive-compatible payload
3. Searches Pipedrive for an existing person by name
4. If found → updates the person, otherwise → creates a new one
5. Returns the resulting Pipedrive Person object

## Setup

### Prerequisites

- Node.js (v18 or higher)
- A [Pipedrive](https://www.pipedrive.com/en/register) account with API access

### Installation

```bash
git clone https://github.com/yash-rana0101/pd-assignment.git
cd pd-assignment
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PIPEDRIVE_API_KEY=your_api_key_here
PIPEDRIVE_COMPANY_DOMAIN=your_company_subdomain
```

- **API Key**: Found in Pipedrive under Settings → Personal Preferences → API
- **Company Domain**: The subdomain from your Pipedrive URL (e.g., `mycompany` from `https://mycompany.pipedrive.com`)

### Run

```bash
npm run dev
```

Or build and run the compiled output:

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── index.ts                      # Entry point — orchestrates the sync flow
├── types/
│   ├── pipedrive.ts              # PipedrivePerson type definition
│   └── mapping.ts                # Types for mappings, payloads, API responses
├── services/
│   └── pipedrive.service.ts      # Pipedrive API calls (search, create, update)
├── utils/
│   └── mapping.utils.ts          # Data mapping logic (dot-path resolution, payload building)
└── mappings/
    ├── inputData.json            # Source person data
    └── mappings.json             # Field-to-field mapping configuration
```

## How Mappings Work

Each entry in `mappings.json` maps a Pipedrive person field to a path in `inputData.json`:

```json
[
  { "pipedriveKey": "name", "inputKey": "fullName" },
  { "pipedriveKey": "email", "inputKey": "emailAdress" },
  { "pipedriveKey": "phone", "inputKey": "phoneNumber.home" }
]
```

- `inputKey` supports **dot notation** for nested fields — `phoneNumber.home` resolves to `inputData.phoneNumber.home`
- `email` and `phone` fields are automatically formatted into Pipedrive's expected array structure: `[{ value, primary, label }]`
- The mapping is flexible — any valid combination of mappings will work as long as `name` is included

## Edge Cases Handled

### 1. Unresolvable Input Paths

If a mapping's `inputKey` doesn't exist in `inputData.json` (e.g., a typo or missing nested key), the field is **skipped with a warning** instead of crashing:

```
Mapping skipped: "phone.home" not found in inputData. "phone" won't be set.
```

### 2. Missing Name Mapping

The `name` field is required by Pipedrive for both searching and creating persons. If no mapping has `pipedriveKey: "name"`, the function throws a clear error before making any API calls:

```
No mapping found for "name" — it is required to search/create persons.
```

### 3. API Errors (401, 404, 429, Network Failures)

Instead of generic catch blocks, each failure scenario gets a specific, actionable error message:

| Status | Error Message |
|--------|--------------|
| 401 | Authentication failed. Check your PIPEDRIVE_API_KEY. |
| 404 | Endpoint not found. Check PIPEDRIVE_COMPANY_DOMAIN. |
| 429 | Rate limit exceeded. Wait a moment and try again. |
| Network | Network error: connection details and troubleshooting hint |

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/persons/search` | Search for existing person by exact name |
| `POST` | `/api/v1/persons` | Create a new person |
| `PUT` | `/api/v1/persons/{id}` | Update an existing person |

Authentication is done via the `api_token` query parameter as per [Pipedrive API docs](https://developers.pipedrive.com/docs/api/v1).

## Sample Output

```
Person name: "Jason"
Payload: {
  "name": "Jason",
  "email": [{ "value": "Jason@email.com", "primary": true, "label": "work" }],
  "phone": [{ "value": "123-456-7890", "primary": true, "label": "home" }]
}
Searching for person: "Jason"...
  Found existing person (ID: 1)
Updating person (ID: 1)...
  Updated person (ID: 1)

Sync complete!
Done.
```
