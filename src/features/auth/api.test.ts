import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { authPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import {
  getCurrentUser,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
} from "./api";

describe("auth API", () => {
  it("bootstraps CSRF and requests recovery with only the email", async () => {
    const calls: string[] = [];
    server.use(
      http.get(authPaths.csrf, () => {
        calls.push("csrf");
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(authPaths.forgotPassword, async ({ request }) => {
        calls.push("forgot");
        expect(await request.json()).toEqual({ email: "admin@example.test" });
        return HttpResponse.json({ message: "Check your email." });
      }),
    );

    await expect(
      requestPasswordReset("admin@example.test"),
    ).resolves.toBeUndefined();
    expect(calls).toEqual(["csrf", "forgot"]);
  });

  it("sends the reset token and confirmed password and preserves token errors", async () => {
    server.use(
      http.post(authPaths.resetPassword, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "admin@example.test",
          token: "reset-token",
          password: "new-password-123",
          password_confirmation: "new-password-123",
        });
        return HttpResponse.json(
          {
            errors: {
              token: ["This password reset link is invalid or expired."],
            },
          },
          { status: 422 },
        );
      }),
    );

    await expect(
      resetPassword({
        email: "admin@example.test",
        token: "reset-token",
        password: "new-password-123",
        password_confirmation: "new-password-123",
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { token: "This password reset link is invalid or expired." },
    });
  });

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
