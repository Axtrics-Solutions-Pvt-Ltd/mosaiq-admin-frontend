import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";

import { authPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { changePassword } from "./api";

it("posts the current and confirmed new password to the authenticated endpoint", async () => {
  server.use(
    http.post(authPaths.changePassword, async ({ request }) => {
      expect(await request.json()).toEqual({
        current_password: "current",
        password: "new-password-123",
        password_confirmation: "new-password-123",
      });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await expect(
    changePassword({
      current_password: "current",
      password: "new-password-123",
      password_confirmation: "new-password-123",
    }),
  ).resolves.toBeUndefined();
});
