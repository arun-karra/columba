import { Router } from "express";
import {
  AcceptGroupInviteParams,
  DeclineGroupInviteParams,
} from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { defaultEmojiForGroup } from "../lib/groupEmoji";
import { asyncHandler, HttpError, parseOrThrow, requireParam } from "../lib/errors";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function mapInvite(invite: {
  id: string;
  groupId: string;
  createdAt: Date;
  group: { name: string; emoji: string | null };
  invitedBy: { email: string | null; displayName: string | null };
}) {
  return {
    id: invite.id,
    groupId: invite.groupId,
    groupName: invite.group.name,
    groupEmoji: invite.group.emoji ?? defaultEmojiForGroup(invite.group.name),
    invitedByEmail: invite.invitedBy.email,
    invitedByName: invite.invitedBy.displayName,
    createdAt: invite.createdAt,
  };
}

const inviteInclude = {
  group: { select: { name: true, emoji: true } },
  invitedBy: { select: { email: true, displayName: true } },
} as const;

async function getPendingInviteForUser(inviteId: string, email: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
    include: inviteInclude,
  });
  if (!invite || invite.status !== "pending") {
    throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
  }
  if (invite.email !== email) {
    throw new HttpError(403, "FORBIDDEN", "This invitation is not for your account.");
  }
  return invite;
}

router.get(
  "/group-invites",
  asyncHandler(async (req, res) => {
    const email = (req as AuthenticatedRequest).userEmail.trim().toLowerCase();
    if (!email) {
      res.json([]);
      return;
    }

    const invites = await prisma.groupInvite.findMany({
      where: { email, status: "pending" },
      include: inviteInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(invites.map(mapInvite));
  }),
);

router.post(
  "/group-invites/:id/accept",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const email = (req as AuthenticatedRequest).userEmail.trim().toLowerCase();
    const { id } = parseOrThrow(AcceptGroupInviteParams, {
      id: requireParam(req.params.id, "id"),
    });

    const invite = await getPendingInviteForUser(id, email);

    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId } },
        update: {},
        create: { groupId: invite.groupId, userId, role: "member" },
      });
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });
    });

    res.json({ groupId: invite.groupId });
  }),
);

router.post(
  "/group-invites/:id/decline",
  asyncHandler(async (req, res) => {
    const email = (req as AuthenticatedRequest).userEmail.trim().toLowerCase();
    const { id } = parseOrThrow(DeclineGroupInviteParams, {
      id: requireParam(req.params.id, "id"),
    });

    const invite = await getPendingInviteForUser(id, email);
    await prisma.groupInvite.update({
      where: { id: invite.id },
      data: { status: "declined" },
    });
    res.status(204).send();
  }),
);

export default router;
