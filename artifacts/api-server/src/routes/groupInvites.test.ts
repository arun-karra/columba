import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp } from "../test/testApp";
import type { MockPrisma } from "../test/mockPrisma";

vi.mock("../lib/prisma", async () => {
  const { createMockPrisma } = await import("../test/mockPrisma");
  return { prisma: createMockPrisma() };
});

const { prisma } = await import("../lib/prisma");
const mockPrisma = prisma as unknown as MockPrisma;

const groupInvitesRouter = (await import("./groupInvites")).default;
const app = buildTestApp(groupInvitesRouter);

const invitee = { id: "invitee-1", email: "invitee@example.com" };

const pendingInvite = {
  id: "invite-1",
  groupId: "group-1",
  email: "invitee@example.com",
  status: "pending",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  group: { name: "Household", emoji: "🏠" },
  invitedBy: { email: "admin@example.com", displayName: "Admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(mockPrisma));
});

describe("GET /api/group-invites", () => {
  it("returns pending invites for the signed-in user's email", async () => {
    mockPrisma.groupInvite.findMany.mockResolvedValue([pendingInvite]);

    const res = await request(app).get("/api/group-invites").set(authHeader(invitee));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: "invite-1",
        groupName: "Household",
        invitedByEmail: "admin@example.com",
      }),
    ]);
    expect(mockPrisma.groupInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "invitee@example.com", status: "pending" },
      }),
    );
  });
});

describe("POST /api/group-invites/:id/accept", () => {
  it("adds the user to the group and marks the invite accepted", async () => {
    mockPrisma.groupInvite.findUnique.mockResolvedValue(pendingInvite);
    mockPrisma.groupMembership.upsert.mockResolvedValue({});
    mockPrisma.groupInvite.update.mockResolvedValue({});

    const res = await request(app)
      .post("/api/group-invites/invite-1/accept")
      .set(authHeader(invitee));

    expect(res.status).toBe(200);
    expect(res.body.groupId).toBe("group-1");
    expect(mockPrisma.groupMembership.upsert).toHaveBeenCalled();
    expect(mockPrisma.groupInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-1" },
        data: { status: "accepted" },
      }),
    );
  });

  it("forbids accepting an invite meant for another email", async () => {
    mockPrisma.groupInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      email: "other@example.com",
    });

    const res = await request(app)
      .post("/api/group-invites/invite-1/accept")
      .set(authHeader(invitee));

    expect(res.status).toBe(403);
    expect(mockPrisma.groupMembership.upsert).not.toHaveBeenCalled();
  });
});

describe("POST /api/group-invites/:id/decline", () => {
  it("marks the invite declined", async () => {
    mockPrisma.groupInvite.findUnique.mockResolvedValue(pendingInvite);
    mockPrisma.groupInvite.update.mockResolvedValue({});

    const res = await request(app)
      .post("/api/group-invites/invite-1/decline")
      .set(authHeader(invitee));

    expect(res.status).toBe(204);
    expect(mockPrisma.groupInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-1" },
        data: { status: "declined" },
      }),
    );
  });
});
