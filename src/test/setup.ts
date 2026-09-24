import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { resetAuthMock } from "@/mocks/handlers";
import { server } from "@/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // Vitest globals are off, so Testing Library cannot register this itself.
  cleanup();
  server.resetHandlers();
  resetAuthMock();
});
afterAll(() => server.close());
