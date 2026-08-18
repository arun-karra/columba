import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildTestApp } from "../test/testApp";
import type { MockPrisma } from "../test/mockPrisma";

vi.mock("../lib/appleAuth", () => ({
  verifyAppleIdentityToken: vi.fn(),
}));

vi.mock("../lib/prisma", async () => {
  const { createMockPrisma } = await import("../test/mockPrisma");
  return { prisma: createMockPrisma() };
});

const { verifyAppleIdentityToken } = await import("../lib/appleAuth");
const mockVerifyApple = vi.mocked(verifyAppleIdentityToken);

const { prisma } = await import("../lib/prisma");
const mockPrisma = prisma as unknown as MockPrisma;

const authRouter = (await import("./auth")).default;
const app = buildTestApp(authRouter);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(mockPrisma));
});

describe("POST /api/auth/apple", () => {
  it("creates a user from a valid Apple token and returns a JWT", async () => {
    mockVerifyApple.mockResolvedValue({
      sub: "apple-user-123",
      email: "apple@privaterelay.appleid.com",
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u1",
      email: "apple@privaterelay.appleid.com",
      appleUserId: "apple-user-123",
      displayName: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    mockPrisma.groupInvite.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/auth/apple")
      .send({ identityToken: "valid.jwt.token" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.id).toBe("u1");
    expect(res.body.user.signedInWithApple).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        appleUserId: "apple-user-123",
        email: "apple@privaterelay.appleid.com",
      },
    });
  });

  it("rejects an invalid Apple token with 401", async () => {
    mockVerifyApple.mockRejectedValue(new Error("bad token"));

    const res = await request(app)
      .post("/api/auth/apple")
      .send({ identityToken: "invalid.jwt.token" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_APPLE_TOKEN");
  });

  it("does not auto-accept pending group invites on sign-in", async () => {
    mockVerifyApple.mockResolvedValue({
      sub: "apple-user-456",
      email: "invited@example.com",
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u2",
      email: "invited@example.com",
      appleUserId: "apple-user-456",
      displayName: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await request(app)
      .post("/api/auth/apple")
      .send({ identityToken: "valid.jwt.token" });

    expect(res.status).toBe(200);
    expect(mockPrisma.groupMembership.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.groupInvite.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/dev-bypass", () => {
  it("returns a JWT when the bypass code matches", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      id: "dev-user",
      email: "dev@columba.local",
      appleUserId: null,
      displayName: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    mockPrisma.groupInvite.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/auth/dev-bypass")
      .send({ code: "test-bypass-secret" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe("dev@columba.local");
    expect(res.body.user.signedInWithApple).toBe(false);
  });

  it("rejects a wrong bypass code with 401", async () => {
    const res = await request(app)
      .post("/api/auth/dev-bypass")
      .send({ code: "wrong-code" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CODE");
  });

  it("is disabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await request(app)
      .post("/api/auth/dev-bypass")
      .send({ code: "test-bypass-secret" });

    expect(res.status).toBe(404);
    vi.unstubAllEnvs();
  });
});
