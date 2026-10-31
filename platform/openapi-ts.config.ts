import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Hey API client generation for the versioned FastAPI contract.
 *
 * The current contract defines only the health and metadata endpoints.
 * `pnpm generate:api` validates `../contracts/openapi/v1.json` and produces
 * `src/api/generated/`, which is never hand-edited. Citizen screens keep the
 * handwritten transport in `src/api/client.ts` until the contract also defines
 * session, law and answer operations.
 */
export default defineConfig({
  input: '../contracts/openapi/v1.json',
  output: {
    path: 'src/api/generated',
    clean: true,
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@tanstack/react-query',
  ],
});
