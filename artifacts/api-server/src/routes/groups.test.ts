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

const groupsRouter = (await import("./groups")).default;
const app = buildTestApp(groupsRouter);

const admin = { id: "admin-1", email: "admin@example.com" };
const member = { id: "member-1", email: "member@example.com" };
const outsider = { id: "outsider-1", email: "outsider@example.com" };

function makeGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: "group-1",
    name: "Household",
    createdByUserId: admin.id,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    memberships: [
      { userId: admin.id, role: "admin", createdAt: new Date("2026-01-01T00:00:00Z"), user: { email: admin.email } },
      { userId: member.id, role: "member", createdAt: new Date("2026-01-01T00:00:00Z"), user: { email: member.email } },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.pushToken.findMany.mockResolvedValue([]);
});

describe("GET /api/groups", () => {
  it("returns the caller's groups with members mapped", async () => {
    mockPrisma.group.findMany.mockResolvedValue([makeGroup()]);

    const res = await request(app).get("/api/groups").set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body[0].members).toEqual([
      { userId: admin.id, email: admin.email, role: "admin", createdAt: expect.any(String) },
      { userId: member.id, email: member.email, role: "member", createdAt: expect.any(String) },
    ]);
  });
});

describe("POST /api/groups", () => {
  it("creates a group with the caller as admin", async () => {
    mockPrisma.group.create.mockResolvedValue(makeGroup());

    const res = await request(app).post("/api/groups").set(authHeader(admin)).send({ name: "Household" });

    expect(res.status).toBe(201);
    expect(mockPrisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Household",
          createdByUserId: admin.id,
          memberships: { create: { userId: admin.id, role: "admin" } },
        }),
      }),
    );
  });

  it("rejects an empty name", async () => {
    const res = await request(app).post("/api/groups").set(authHeader(admin)).send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/groups/:id", () => {
  it("returns the group for a member", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.group.findUnique.mockResolvedValue(makeGroup());

    const res = await request(app).get("/api/groups/group-1").set(authHeader(admin));
    expect(res.status).toBe(200);
  });

  it("forbids a non-member", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/groups/group-1").set(authHeader(outsider));
    expect(res.status).toBe(403);
    expect(mockPrisma.group.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the group doesn't exist", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.group.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/groups/group-1").set(authHeader(admin));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/groups/:id/invite", () => {
  it("forbids a non-member from inviting", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set(authHeader(outsider))
      .send({ email: "new@example.com" });

    expect(res.status).toBe(403);
  });

  it("creates a pending invite and notifies an existing user", async () => {
    mockPrisma.groupMembership.findUnique
      .mockResolvedValueOnce({ groupId: "group-1", userId: admin.id, role: "admin" }) // inviter membership
      .mockResolvedValueOnce(null); // invitee not already a member
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: "new-user", email: "new@example.com" }) // invitee lookup
      .mockResolvedValueOnce({ email: admin.email, displayName: null }); // inviter lookup
    mockPrisma.groupInvite.upsert.mockResolvedValue({
      id: "invite-1",
      groupId: "group-1",
      email: "new@example.com",
      status: "pending",
    });
    mockPrisma.group.findUniqueOrThrow.mockResolvedValue({ name: "Household" });
    mockPrisma.pushToken.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set(authHeader(admin))
      .send({ email: "new@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(mockPrisma.groupMembership.create).not.toHaveBeenCalled();
    expect(mockPrisma.groupInvite.upsert).toHaveBeenCalled();
  });

  it("rejects inviting someone who is already a member", async () => {
    mockPrisma.groupMembership.findUnique
      .mockResolvedValueOnce({ groupId: "group-1", userId: admin.id, role: "admin" })
      .mockResolvedValueOnce({ groupId: "group-1", userId: "existing", role: "member" });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing", email: "existing@example.com" });

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set(authHeader(admin))
      .send({ email: "existing@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ALREADY_MEMBER");
  });

  it("creates a pending invite for an email with no account yet", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValueOnce({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set(authHeader(admin))
      .send({ email: "nobody-yet@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(mockPrisma.groupInvite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_email: { groupId: "group-1", email: "nobody-yet@example.com" } },
      }),
    );
  });
});

describe("DELETE /api/groups/:id", () => {
  it("lets an admin delete the group", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.group.delete.mockResolvedValue({});

    const res = await request(app).delete("/api/groups/group-1").set(authHeader(admin));
    expect(res.status).toBe(204);
    expect(mockPrisma.group.delete).toHaveBeenCalledWith({ where: { id: "group-1" } });
  });

  it("forbids a non-admin from deleting the group", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: member.id, role: "member" });

    const res = await request(app).delete("/api/groups/group-1").set(authHeader(member));
    expect(res.status).toBe(403);
    expect(mockPrisma.group.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the group doesn't exist", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.group.delete.mockRejectedValue(new Error("not found"));

    const res = await request(app).delete("/api/groups/group-1").set(authHeader(admin));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/groups/:id/members/:userId", () => {
  it("lets a member remove themselves (leave) even without admin role", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: member.id, role: "member" });
    mockPrisma.groupMembership.delete.mockResolvedValue({});

    const res = await request(app).delete(`/api/groups/group-1/members/${member.id}`).set(authHeader(member));
    expect(res.status).toBe(204);
  });

  it("forbids a non-admin from removing someone else", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: member.id, role: "member" });

    const res = await request(app).delete(`/api/groups/group-1/members/${admin.id}`).set(authHeader(member));
    expect(res.status).toBe(403);
    expect(mockPrisma.groupMembership.delete).not.toHaveBeenCalled();
  });

  it("lets an admin remove another member", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.groupMembership.delete.mockResolvedValue({});

    const res = await request(app).delete(`/api/groups/group-1/members/${member.id}`).set(authHeader(admin));
    expect(res.status).toBe(204);
  });

  it("returns 404 when the membership doesn't exist", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: admin.id, role: "admin" });
    mockPrisma.groupMembership.delete.mockRejectedValue(new Error("not found"));

    const res = await request(app).delete(`/api/groups/group-1/members/ghost`).set(authHeader(admin));
    expect(res.status).toBe(404);
  });
});
