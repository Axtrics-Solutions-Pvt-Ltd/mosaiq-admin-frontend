import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { resetAuthMock } from "@/mocks/handlers";
import { server } from "@/mocks/server";

// Responsive charts observe their container; jsdom has no layout to observe.
if (!("ResizeObserver" in globalThis))
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // Vitest globals are off, so Testing Library cannot register this itself.
  cleanup();
  server.resetHandlers();
  resetAuthMock();
});
afterAll(() => server.close());
