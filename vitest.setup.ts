import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./tests/setup/msw";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
