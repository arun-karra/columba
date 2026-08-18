import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildTestApp, authHeader } from "../test/testApp";
import type { MockPrisma } from "../test/mockPrisma";

vi.mock("../lib/prisma", async () => {
  const { createMockPrisma } = await import("../test/mockPrisma");
  return { prisma: createMockPrisma() };
});

const { prisma } = await import("../lib/prisma");
const mockPrisma = prisma as unknown as MockPrisma;

const usersRouter = (await import("./users")).default;
const app = buildTestApp(usersRouter);

const owner = { id: "u1", email: "owner@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/me", () => {
  it("returns the authenticated user profile", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      displayName: "Alex",
      appleUserId: "apple-123",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await request(app).get("/api/me").set(authHeader(owner));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: "u1",
      email: "owner@example.com",
      displayName: "Alex",
      signedInWithApple: true,
    });
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/me", () => {
  it("updates displayName", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      displayName: "Jordan",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await request(app)
      .patch("/api/me")
      .set(authHeader(owner))
      .send({ displayName: "Jordan" });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Jordan");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { displayName: "Jordan" },
    });
  });

  it("clears displayName when sent as empty string", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      displayName: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await request(app)
      .patch("/api/me")
      .set(authHeader(owner))
      .send({ displayName: "   " });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { displayName: null },
    });
  });
});
