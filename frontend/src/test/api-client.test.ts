import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // clear document.cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("attaches CSRF token header for mutating requests when cookie exists", async () => {
    document.cookie = "csrf_token=test-csrf-token-123";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await apiClient<{ status: string }>("/test-endpoint", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    expect(result).toEqual({ status: "ok" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs?.[1] as RequestInit;
    const headers = options?.headers as Headers;
    expect(headers.get("X-CSRF-Token")).toBe("test-csrf-token-123");
  });

  it("throws structured ApiError when backend returns an error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
            details: [],
            request_id: "req-123",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await expect(
      apiClient("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "bad@example.com", password: "wrong" }),
      })
    ).rejects.toThrow(ApiError);
  });
});
