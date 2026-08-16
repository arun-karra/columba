import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { HttpError } from "../lib/errors";
import { requireAuth, signUserToken, type AuthenticatedRequest } from "./auth";

const user = { id: "user-1", email: "a@b.com" };

function fakeReq(header?: string) {
  return { header: () => header } as unknown as AuthenticatedRequest;
}

describe("signUserToken / requireAuth", () => {
  it("round-trips: a token signed by signUserToken is accepted by requireAuth", () => {
    const token = signUserToken(user);
    const req = fakeReq(`Bearer ${token}`);
    const next = vi.fn();

    requireAuth(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(user.id);
    expect(req.userEmail).toBe(user.email);
  });

  it("rejects a missing Authorization header", () => {
    const next = vi.fn();
    requireAuth(fakeReq(undefined), {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
  });

  it("rejects a header that isn't a Bearer token", () => {
    const next = vi.fn();
    requireAuth(fakeReq("Basic abc123"), {} as never, next);

    expect((next.mock.calls[0]?.[0] as HttpError).status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", () => {
    const badToken = jwt.sign({ userId: user.id, email: user.email }, "wrong-secret");
    const next = vi.fn();
    requireAuth(fakeReq(`Bearer ${badToken}`), {} as never, next);

    expect((next.mock.calls[0]?.[0] as HttpError).status).toBe(401);
  });

  it("rejects a token with a malformed payload", () => {
    const malformed = jwt.sign({ notUserId: 123 }, process.env.SESSION_SECRET as string);
    const next = vi.fn();
    requireAuth(fakeReq(`Bearer ${malformed}`), {} as never, next);

    expect((next.mock.calls[0]?.[0] as HttpError).status).toBe(401);
  });
});
