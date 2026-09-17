import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { authPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { getCurrentUser, login, logout } from "./api";

describe("auth API", () => {
  it("bootstraps CSRF before login", async () => {
    const calls: string[] = [];
    server.use(
      http.get(authPaths.csrf, () => {
        calls.push("csrf");
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(authPaths.login, () => {
        calls.push("login");
        return HttpResponse.json({
          data: {
            id: 1,
            name: "Admin",
            email: "admin@example.test",
            platform_role_code: "SUPER_ADMIN",
            membership: null,
          },
        });
      }),
    );
    const user = await login({
      email: "admin@example.test",
      password: "test input",
    });
    expect(calls).toEqual(["csrf", "login"]);
    expect(user.platformRoleCode).toBe("SUPER_ADMIN");
  });

  it("restores the current user and signs out", async () => {
    await login({ email: "admin@example.test", password: "test input" });
    await expect(getCurrentUser()).resolves.toMatchObject({
      id: 1,
      name: "Demo Admin",
    });
    await expect(logout()).resolves.toBeUndefined();
    await expect(getCurrentUser()).rejects.toMatchObject({
      status: 401,
      errorCode: "UNAUTHENTICATED",
    });
  });

  it("keeps server field errors and request IDs without exposing raw messages", async () => {
    server.use(
      http.post(authPaths.login, () =>
        HttpResponse.json(
          {
            message: "internal detail",
            error_code: "VALIDATION_FAILED",
            errors: { email: ["Invalid email"] },
            request_id: "req-123",
          },
          { status: 422 },
        ),
      ),
    );
    try {
      await login({ email: "bad", password: "test input" });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 422,
        errorCode: "VALIDATION_FAILED",
        fieldErrors: { email: "Invalid email" },
        requestId: "req-123",
      });
      expect((error as Error).message).not.toContain("internal detail");
    }
  });
});
