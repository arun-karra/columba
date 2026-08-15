import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildTestApp } from "../test/testApp";
import type { MockPrisma } from "../test/mockPrisma";

vi.mock("../lib/prisma", async () => {
  const { createMockPrisma } = await import("../test/mockPrisma");
  return { prisma: createMockPrisma() };
});

const { prisma } = await import("../lib/prisma");
const mockPrisma = prisma as unknown as MockPrisma;

const authRouter = (await import("./auth")).default;
const app = buildTestApp(authRouter);

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(mockPrisma));
});

describe("POST /api/auth/request-code", () => {
  it("stores a hashed code with a 10-minute expiry", async () => {
    mockPrisma.loginCode.create.mockResolvedValue({});

    const res = await request(app)
      .post("/api/auth/request-code")
      .send({ email: "new-user@example.com" });

    expect(res.status).toBe(200);
    expect(mockPrisma.loginCode.create).toHaveBeenCalledTimes(1);
    const data = mockPrisma.loginCode.create.mock.calls[0][0].data;
    expect(data.email).toBe("new-user@example.com");
    expect(data.codeHash).toMatch(/^[a-f0-9]{64}$/);
    const minutesUntilExpiry = (new Date(data.expiresAt).getTime() - Date.now()) / 60_000;
    expect(minutesUntilExpiry).toBeGreaterThan(9.5);
    expect(minutesUntilExpiry).toBeLessThanOrEqual(10);
  });

  it("rejects an invalid email with 400", async () => {
    const res = await request(app).post("/api/auth/request-code").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockPrisma.loginCode.create).not.toHaveBeenCalled();
  });

  it("rate-limits repeat requests for the same email within 45s", async () => {
    mockPrisma.loginCode.create.mockResolvedValue({});
    const email = "rate-limited@example.com";

    const first = await request(app).post("/api/auth/request-code").send({ email });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/auth/request-code").send({ email });
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe("RATE_LIMITED");
    expect(mockPrisma.loginCode.create).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/verify", () => {
  it("accepts the dev bypass code 000000 for any email without checking the database", async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: "u1", email: "anyone@example.com" });
    mockPrisma.groupInvite.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "anyone@example.com", code: "000000" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: "u1", email: "anyone@example.com" });
    expect(mockPrisma.loginCode.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.loginCode.update).not.toHaveBeenCalled();
  });

  it("verifies a real code, marks it consumed, and creates/returns the user", async () => {
    const loginCodeId = "login-code-42";
    mockPrisma.loginCode.findFirst.mockResolvedValue({
      id: loginCodeId,
      email: "real@example.com",
      codeHash: hashCode("654321"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    mockPrisma.user.upsert.mockResolvedValue({ id: "u2", email: "real@example.com" });
    mockPrisma.groupInvite.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "real@example.com", code: "654321" });

    expect(res.status).toBe(200);
    // This is the exact call that broke when `loginCode` was referenced
    // out of scope inside the $transaction callback.
    expect(mockPrisma.loginCode.update).toHaveBeenCalledWith({
      where: { id: loginCodeId },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("rejects a code that doesn't match the stored hash", async () => {
    mockPrisma.loginCode.findFirst.mockResolvedValue({
      id: "lc1",
      email: "real@example.com",
      codeHash: hashCode("111111"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "real@example.com", code: "222222" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CODE");
    expect(mockPrisma.loginCode.update).not.toHaveBeenCalled();
  });

  it("rejects an expired code", async () => {
    mockPrisma.loginCode.findFirst.mockResolvedValue({
      id: "lc1",
      email: "real@example.com",
      codeHash: hashCode("654321"),
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
    });

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "real@example.com", code: "654321" });

    expect(res.status).toBe(401);
  });

  it("rejects when no unconsumed code exists for the email", async () => {
    mockPrisma.loginCode.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "nobody@example.com", code: "654321" });

    expect(res.status).toBe(401);
  });

  it("accepts pending group invites for the email on successful verification", async () => {
    mockPrisma.loginCode.findFirst.mockResolvedValue({
      id: "lc1",
      email: "invited@example.com",
      codeHash: hashCode("654321"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    mockPrisma.user.upsert.mockResolvedValue({ id: "u3", email: "invited@example.com" });
    mockPrisma.groupInvite.findMany.mockResolvedValue([
      { id: "invite-1", groupId: "group-1", email: "invited@example.com", status: "pending" },
    ]);

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email: "invited@example.com", code: "654321" });

    expect(res.status).toBe(200);
    expect(mockPrisma.groupMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_userId: { groupId: "group-1", userId: "u3" } },
        create: { groupId: "group-1", userId: "u3", role: "member" },
      }),
    );
    expect(mockPrisma.groupInvite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "accepted" },
    });
  });
});
