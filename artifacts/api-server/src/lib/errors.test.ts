import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HttpError, parseOrThrow, requireParam, sendError } from "./errors";

describe("parseOrThrow", () => {
  const schema = z.object({ email: z.string().min(1) });

  it("returns the parsed data on success", () => {
    expect(parseOrThrow(schema, { email: "a@b.com" })).toEqual({ email: "a@b.com" });
  });

  it("throws a 400 HttpError with a readable message on failure", () => {
    try {
      parseOrThrow(schema, { email: "" });
      expect.unreachable("parseOrThrow should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.status).toBe(400);
      expect(httpError.code).toBe("VALIDATION_ERROR");
      expect(httpError.message).toContain("email");
    }
  });
});

describe("requireParam", () => {
  it("returns the value when present", () => {
    expect(requireParam("abc", "id")).toBe("abc");
  });

  it("throws a 400 HttpError when missing", () => {
    expect(() => requireParam(undefined, "id")).toThrow(HttpError);
  });

  it("throws a 400 HttpError when given an array (repeated query param)", () => {
    expect(() => requireParam(["a", "b"], "id")).toThrow(HttpError);
  });
});

describe("sendError", () => {
  function fakeRes() {
    const res = {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(body: unknown) {
        res.body = body;
        return res;
      },
    };
    return res;
  }

  it("uses the HttpError's status, code, and message", () => {
    const res = fakeRes();
    sendError(res as never, new HttpError(403, "FORBIDDEN", "Nope."));
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: { message: "Nope.", code: "FORBIDDEN" } });
  });

  it("hides unexpected error details behind a generic 500", () => {
    const res = fakeRes();
    sendError(res as never, new Error("a database password leaked here"));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { message: "Something went wrong.", code: "INTERNAL_ERROR" },
    });
  });
});
