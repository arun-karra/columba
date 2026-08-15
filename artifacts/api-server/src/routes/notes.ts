import { Router } from "express";
import {
  CreateNoteBody,
  UpdateNoteBody,
  GetNoteParams,
  UpdateNoteParams,
  DeleteNoteParams,
  ToggleNoteDoneParams,
} from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError, parseOrThrow, requireParam } from "../lib/errors";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { sendPush, sendDismissPush } from "../lib/push";

const PINNED_NOTE_CATEGORY = "PINNED_NOTE";

const router = Router();
router.use(requireAuth);

const noteInclude = {
  group: true,
  completedBy: { select: { id: true, email: true } },
} as const;

function mapNote(note: {
  id: string;
  ownerId: string;
  groupId: string | null;
  title: string | null;
  body: string;
  audioUrl: string | null;
  isUrgent: boolean;
  remindAt: Date | null;
  reminderSentAt: Date | null;
  isDone: boolean;
  isPinned: boolean;
  completedByUserId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  group: { name: string } | null;
  completedBy: { id: string; email: string } | null;
}) {
  return {
    id: note.id,
    ownerId: note.ownerId,
    groupId: note.groupId,
    groupName: note.group?.name ?? null,
    title: note.title,
    body: note.body,
    audioUrl: note.audioUrl,
    isUrgent: note.isUrgent,
    remindAt: note.remindAt,
    reminderSentAt: note.reminderSentAt,
    isDone: note.isDone,
    isPinned: note.isPinned,
    completedByUserId: note.completedByUserId,
    completedByEmail: note.completedBy?.email ?? null,
    completedAt: note.completedAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function groupIdsForUser(userId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  });
  return memberships.map((membership) => membership.groupId);
}

async function getVisibleNote(id: string, userId: string) {
  const groupIds = await groupIdsForUser(userId);
  const note = await prisma.note.findUnique({ where: { id }, include: noteInclude });
  if (!note) throw new HttpError(404, "NOT_FOUND", "Note not found.");
  const visible = note.ownerId === userId || (note.groupId !== null && groupIds.includes(note.groupId));
  if (!visible) throw new HttpError(403, "FORBIDDEN", "You do not have access to this note.");
  return note;
}

async function ensureGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new HttpError(403, "FORBIDDEN", "You must be a member of that group.");
  return membership;
}

router.get(
  "/notes",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const groupIds = await groupIdsForUser(userId);
    const notes = await prisma.note.findMany({
      where: { OR: [{ ownerId: userId, groupId: null }, { groupId: { in: groupIds } }] },
      include: noteInclude,
      orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
    });
    res.json(notes.map(mapNote));
  }),
);

router.post(
  "/notes",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const input = parseOrThrow(CreateNoteBody, req.body);
    if (input.groupId) await ensureGroupMember(input.groupId, userId);
    const note = await prisma.note.create({
      data: {
        ownerId: userId,
        body: input.body,
        title: input.title ?? null,
        audioUrl: input.audioUrl ?? null,
        isUrgent: input.isUrgent ?? false,
        isPinned: input.isPinned ?? false,
        remindAt: input.remindAt ?? null,
        groupId: input.groupId ?? null,
      },
      include: noteInclude,
    });
    if (note.isPinned) {
      void sendPush(
        [userId],
        note.title ?? "Pinned note",
        note.body,
        { noteId: note.id },
        { urgent: true, categoryId: PINNED_NOTE_CATEGORY },
      );
    }
    res.status(201).json(mapNote(note));
  }),
);

router.get(
  "/notes/summary",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const groupIds = await groupIdsForUser(userId);
    const where = { OR: [{ ownerId: userId, groupId: null }, { groupId: { in: groupIds } }] };
    const [total, completed, urgent, upcomingReminders] = await Promise.all([
      prisma.note.count({ where }),
      prisma.note.count({ where: { ...where, isDone: true } }),
      prisma.note.count({ where: { ...where, isUrgent: true, isDone: false } }),
      prisma.note.count({ where: { ...where, remindAt: { gt: new Date() }, isDone: false } }),
    ]);
    res.json({ total, open: total - completed, completed, urgent, upcomingReminders });
  }),
);

router.get(
  "/notes/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(GetNoteParams, { id: requireParam(req.params.id, "id") });
    res.json(mapNote(await getVisibleNote(id, userId)));
  }),
);

router.patch(
  "/notes/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(UpdateNoteParams, { id: requireParam(req.params.id, "id") });
    const note = await getVisibleNote(id, userId);
    const input = parseOrThrow(UpdateNoteBody, req.body);
    const editingAllowed = note.groupId !== null || note.ownerId === userId;
    if (!editingAllowed) throw new HttpError(403, "FORBIDDEN", "You cannot edit this note.");
    if (input.groupId) await ensureGroupMember(input.groupId, userId);
    const remindAtChanged =
      Object.prototype.hasOwnProperty.call(req.body, "remindAt") &&
      String(input.remindAt ?? "") !== String(note.remindAt?.toISOString() ?? "");
    const wasPinned = note.isPinned;
    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(Object.prototype.hasOwnProperty.call(req.body, "title") ? { title: input.title ?? null } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.audioUrl !== undefined ? { audioUrl: input.audioUrl ?? null } : {}),
        ...(input.isUrgent !== undefined ? { isUrgent: input.isUrgent } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        ...(Object.prototype.hasOwnProperty.call(req.body, "remindAt")
          ? { remindAt: input.remindAt ? new Date(input.remindAt) : null, reminderSentAt: remindAtChanged ? null : note.reminderSentAt }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(req.body, "groupId") ? { groupId: input.groupId ?? null } : {}),
      },
      include: noteInclude,
    });
    // Fire pin/unpin push after the DB write
    const nowPinned = updated.isPinned;
    if (!wasPinned && nowPinned) {
      void sendPush(
        [userId],
        updated.title ?? "Pinned note",
        updated.body,
        { noteId: updated.id },
        { urgent: true, categoryId: PINNED_NOTE_CATEGORY },
      );
    } else if (wasPinned && !nowPinned) {
      void sendDismissPush([userId], updated.id);
    }
    res.json(mapNote(updated));
  }),
);

router.post(
  "/notes/:id/toggle-done",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(ToggleNoteDoneParams, { id: requireParam(req.params.id, "id") });
    const note = await getVisibleNote(id, userId);
    if (note.groupId === null && note.ownerId !== userId) {
      throw new HttpError(403, "FORBIDDEN", "You cannot complete this note.");
    }
    const updated = await prisma.note.update({
      where: { id },
      data: note.isDone
        ? { isDone: false, completedByUserId: null, completedAt: null }
        : { isDone: true, completedByUserId: userId, completedAt: new Date() },
      include: noteInclude,
    });
    // When a pinned note is marked done, tell the device to clear the
    // persistent lock-screen notification.
    if (updated.isPinned && updated.isDone) {
      void sendDismissPush([userId], updated.id);
    }
    res.json(mapNote(updated));
  }),
);

router.delete(
  "/notes/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(DeleteNoteParams, { id: requireParam(req.params.id, "id") });
    const note = await getVisibleNote(id, userId);
    if (note.groupId === null && note.ownerId !== userId) {
      throw new HttpError(403, "FORBIDDEN", "You cannot delete this note.");
    }
    await prisma.note.delete({ where: { id } });
    res.status(204).send();
  }),
);

export default router;