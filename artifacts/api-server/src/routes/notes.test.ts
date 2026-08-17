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

const notesRouter = (await import("./notes")).default;
const app = buildTestApp(notesRouter);

const owner = { id: "owner-1", email: "owner@example.com" };
const otherUser = { id: "other-1", email: "other@example.com" };
const groupMember = { id: "member-1", email: "member@example.com" };

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-1",
    ownerId: owner.id,
    groupId: null,
    title: "Title",
    body: "Body",
    audioUrl: null,
    isUrgent: false,
    remindAt: null,
    reminderSentAt: null,
    isDone: false,
    isPinned: false,
    completedByUserId: null,
    completedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    group: null,
    completedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.pushToken.findMany.mockResolvedValue([]); // no-op push by default
  mockPrisma.groupMembership.findMany.mockResolvedValue([]); // no group memberships by default
});

describe("GET /api/notes", () => {
  it("returns notes owned by the caller or visible via a group, mapped for the client", async () => {
    mockPrisma.groupMembership.findMany.mockResolvedValue([{ groupId: "group-1" }]);
    mockPrisma.note.findMany.mockResolvedValue([
      makeNote({
        groupId: "group-1",
        group: { name: "Household" },
        completedByUserId: "member-1",
        completedBy: { id: "member-1", email: "member@example.com" },
        isDone: true,
      }),
    ]);

    const res = await request(app).get("/api/notes").set(authHeader(owner));

    expect(res.status).toBe(200);
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ ownerId: owner.id, groupId: null }, { groupId: { in: ["group-1"] } }] },
      }),
    );
    expect(res.body[0]).toMatchObject({
      groupName: "Household",
      completedByEmail: "member@example.com",
      isDone: true,
    });
  });

  it("rejects requests without a bearer token", async () => {
    const res = await request(app).get("/api/notes");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/notes", () => {
  it("creates a personal note without requiring group membership", async () => {
    mockPrisma.note.create.mockResolvedValue(makeNote());

    const res = await request(app)
      .post("/api/notes")
      .set(authHeader(owner))
      .send({ body: "Buy milk" });

    expect(res.status).toBe(201);
    expect(mockPrisma.groupMembership.findUnique).not.toHaveBeenCalled();
  });

  it("creates a group note when the caller is a member", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue({ groupId: "group-1", userId: owner.id, role: "member" });
    mockPrisma.note.create.mockResolvedValue(makeNote({ groupId: "group-1" }));

    const res = await request(app)
      .post("/api/notes")
      .set(authHeader(owner))
      .send({ body: "Buy milk", groupId: "group-1" });

    expect(res.status).toBe(201);
  });

  it("rejects a group note when the caller is not a member of that group", async () => {
    mockPrisma.groupMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/notes")
      .set(authHeader(owner))
      .send({ body: "Buy milk", groupId: "group-1" });

    expect(res.status).toBe(403);
    expect(mockPrisma.note.create).not.toHaveBeenCalled();
  });

  it("rejects an empty body with a validation error", async () => {
    const res = await request(app).post("/api/notes").set(authHeader(owner)).send({ body: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/notes/:id (visibility)", () => {
  it("allows the owner of a personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());
    const res = await request(app).get("/api/notes/note-1").set(authHeader(owner));
    expect(res.status).toBe(200);
  });

  it("allows a member of the note's group", async () => {
    mockPrisma.groupMembership.findMany.mockResolvedValue([{ groupId: "group-1" }]);
    mockPrisma.note.findUnique.mockResolvedValue(
      makeNote({ ownerId: owner.id, groupId: "group-1", group: { name: "Household" } }),
    );
    const res = await request(app).get("/api/notes/note-1").set(authHeader(groupMember));
    expect(res.status).toBe(200);
  });

  it("returns 404 when the note doesn't exist", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/notes/missing").set(authHeader(owner));
    expect(res.status).toBe(404);
  });

  it("returns 403 for a personal note the caller doesn't own and isn't shared with them", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());
    const res = await request(app).get("/api/notes/note-1").set(authHeader(otherUser));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/notes/:id", () => {
  it("lets the owner edit their personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());
    mockPrisma.note.update.mockResolvedValue(makeNote({ body: "Updated" }));

    const res = await request(app)
      .patch("/api/notes/note-1")
      .set(authHeader(owner))
      .send({ body: "Updated" });

    expect(res.status).toBe(200);
  });

  it("forbids a non-owner from editing a personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());

    const res = await request(app)
      .patch("/api/notes/note-1")
      .set(authHeader(otherUser))
      .send({ body: "Hijacked" });

    expect(res.status).toBe(403);
    expect(mockPrisma.note.update).not.toHaveBeenCalled();
  });

  it("lets any group member edit a group note", async () => {
    mockPrisma.groupMembership.findMany.mockResolvedValue([{ groupId: "group-1" }]);
    mockPrisma.note.findUnique.mockResolvedValue(
      makeNote({ ownerId: owner.id, groupId: "group-1", group: { name: "Household" } }),
    );
    mockPrisma.note.update.mockResolvedValue(makeNote({ groupId: "group-1", body: "Updated by member" }));

    const res = await request(app)
      .patch("/api/notes/note-1")
      .set(authHeader(groupMember))
      .send({ body: "Updated by member" });

    expect(res.status).toBe(200);
  });

  it("resets reminderSentAt when remindAt changes", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(
      makeNote({ remindAt: new Date("2026-01-01T10:00:00Z"), reminderSentAt: new Date("2026-01-01T10:00:00Z") }),
    );
    mockPrisma.note.update.mockResolvedValue(makeNote());

    await request(app)
      .patch("/api/notes/note-1")
      .set(authHeader(owner))
      .send({ remindAt: "2026-02-01T10:00:00Z" });

    expect(mockPrisma.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reminderSentAt: null }),
      }),
    );
  });
});

describe("POST /api/notes/:id/toggle-done", () => {
  it("marks an open note done and records who completed it", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isDone: false }));
    mockPrisma.note.update.mockResolvedValue(makeNote({ isDone: true }));

    const res = await request(app).post("/api/notes/note-1/toggle-done").set(authHeader(owner));

    expect(res.status).toBe(200);
    expect(mockPrisma.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isDone: true, completedByUserId: owner.id, completedAt: expect.any(Date) },
      }),
    );
  });

  it("reopens a done note and clears completion fields", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isDone: true, completedByUserId: owner.id }));
    mockPrisma.note.update.mockResolvedValue(makeNote({ isDone: false }));

    await request(app).post("/api/notes/note-1/toggle-done").set(authHeader(owner));

    expect(mockPrisma.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isDone: false, completedByUserId: null, completedAt: null },
      }),
    );
  });

  it("forbids a non-owner from completing a personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());

    const res = await request(app).post("/api/notes/note-1/toggle-done").set(authHeader(otherUser));

    expect(res.status).toBe(403);
    expect(mockPrisma.note.update).not.toHaveBeenCalled();
  });

  it("allows any group member to complete a group note", async () => {
    mockPrisma.groupMembership.findMany.mockResolvedValue([{ groupId: "group-1" }]);
    mockPrisma.note.findUnique.mockResolvedValue(
      makeNote({ ownerId: owner.id, groupId: "group-1", group: { name: "Household" } }),
    );
    mockPrisma.note.update.mockResolvedValue(makeNote({ groupId: "group-1", isDone: true }));

    const res = await request(app).post("/api/notes/note-1/toggle-done").set(authHeader(groupMember));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/notes/:id/resend-notification", () => {
  it("returns 204 for a pinned personal note owned by the caller", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isPinned: true }));

    const res = await request(app)
      .post("/api/notes/note-1/resend-notification")
      .set(authHeader(owner));

    expect(res.status).toBe(204);
  });

  it("returns 204 for a scheduled note and loads group recipients", async () => {
    mockPrisma.groupMembership.findMany.mockResolvedValue([
      { userId: owner.id },
      { userId: groupMember.id },
    ]);
    mockPrisma.note.findUnique.mockResolvedValue(
      makeNote({
        groupId: "group-1",
        group: { name: "Household", emoji: "🏠" },
        remindAt: new Date("2026-12-01T10:00:00Z"),
        isPinned: true,
      }),
    );

    const res = await request(app)
      .post("/api/notes/note-1/resend-notification")
      .set(authHeader(owner));

    expect(res.status).toBe(204);
    expect(mockPrisma.groupMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "group-1" } }),
    );
  });

  it("returns 400 when the note has no notification configured", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isPinned: false, remindAt: null }));

    const res = await request(app)
      .post("/api/notes/note-1/resend-notification")
      .set(authHeader(owner));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_NOTIFICATION");
  });

  it("returns 400 when the note is already done", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isPinned: true, isDone: true }));

    const res = await request(app)
      .post("/api/notes/note-1/resend-notification")
      .set(authHeader(owner));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NOTE_DONE");
  });

  it("forbids resending a personal note the caller does not own", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote({ isPinned: true }));

    const res = await request(app)
      .post("/api/notes/note-1/resend-notification")
      .set(authHeader(otherUser));

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/notes/:id", () => {
  it("lets the owner delete their personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());
    mockPrisma.note.delete.mockResolvedValue(makeNote());

    const res = await request(app).delete("/api/notes/note-1").set(authHeader(owner));
    expect(res.status).toBe(204);
  });

  it("forbids a non-owner from deleting a personal note", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(makeNote());

    const res = await request(app).delete("/api/notes/note-1").set(authHeader(otherUser));
    expect(res.status).toBe(403);
    expect(mockPrisma.note.delete).not.toHaveBeenCalled();
  });
});

describe("GET /api/notes/summary", () => {
  it("shapes counts into the summary response", async () => {
    mockPrisma.note.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(4) // completed
      .mockResolvedValueOnce(3); // upcomingReminders

    const res = await request(app).get("/api/notes/summary").set(authHeader(owner));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 10, open: 6, completed: 4, upcomingReminders: 3 });
  });
});
