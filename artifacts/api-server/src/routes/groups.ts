import { Router } from "express";
import {
  CreateGroupBody,
  GetGroupParams,
  InviteToGroupBody,
  InviteToGroupParams,
  RemoveGroupMemberParams,
} from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError, parseOrThrow, requireParam } from "../lib/errors";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { sendPush } from "../lib/push";

const router = Router();
router.use(requireAuth);

const memberSelect = {
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { email: true } },
} as const;

function mapGroup(group: {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: Date;
  memberships: Array<{ userId: string; role: "admin" | "member"; createdAt: Date; user: { email: string | null } }>;
}) {
  return {
    id: group.id,
    name: group.name,
    createdByUserId: group.createdByUserId,
    createdAt: group.createdAt,
    members: group.memberships.map((membership) => ({
      userId: membership.userId,
      email: membership.user.email ?? `user-${membership.userId.slice(0, 8)}`,
      role: membership.role,
      createdAt: membership.createdAt,
    })),
  };
}

async function getMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new HttpError(403, "FORBIDDEN", "You must be a group member.");
  return membership;
}

async function getGroup(groupId: string, userId: string) {
  await getMembership(groupId, userId);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: { select: memberSelect } },
  });
  if (!group) throw new HttpError(404, "NOT_FOUND", "Group not found.");
  return group;
}

router.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const groups = await prisma.group.findMany({
      where: { memberships: { some: { userId } } },
      include: { memberships: { select: memberSelect } },
      orderBy: { createdAt: "asc" },
    });
    res.json(groups.map(mapGroup));
  }),
);

router.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const input = parseOrThrow(CreateGroupBody, req.body);
    const group = await prisma.group.create({
      data: {
        name: input.name.trim(),
        createdByUserId: userId,
        memberships: { create: { userId, role: "admin" } },
      },
      include: { memberships: { select: memberSelect } },
    });
    res.status(201).json(mapGroup(group));
  }),
);

router.get(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(GetGroupParams, { id: requireParam(req.params.id, "id") });
    res.json(mapGroup(await getGroup(id, userId)));
  }),
);

router.post(
  "/groups/:id/invite",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const { id } = parseOrThrow(InviteToGroupParams, { id: requireParam(req.params.id, "id") });
    await getMembership(id, userId);
    const input = parseOrThrow(InviteToGroupBody, req.body);
    const email = input.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId: id, userId: existingUser.id } },
      });
      if (existingMembership) throw new HttpError(400, "ALREADY_MEMBER", "That person is already in the group.");
      await prisma.groupMembership.create({ data: { groupId: id, userId: existingUser.id, role: "member" } });
      const group = await prisma.group.findUniqueOrThrow({ where: { id }, select: { name: true } });
      await sendPush([existingUser.id], "You joined a group", `You were added to ${group.name}.`, { groupId: id });
      return res.json({ status: "added", email, message: "They were added to the group." });
    }

    await prisma.groupInvite.upsert({
      where: { groupId_email: { groupId: id, email } },
      update: { status: "pending", invitedByUserId: userId },
      create: { groupId: id, email, invitedByUserId: userId },
    });
    return res.json({ status: "pending", email, message: "An invitation is waiting for them when they sign in." });
  }),
);

router.delete(
  "/groups/:id/members/:userId",
  asyncHandler(async (req, res) => {
    const currentUserId = (req as AuthenticatedRequest).userId;
    const { id, userId } = parseOrThrow(RemoveGroupMemberParams, {
      id: requireParam(req.params.id, "id"),
      userId: requireParam(req.params.userId, "userId"),
    });
    const currentMembership = await getMembership(id, currentUserId);
    if (userId !== currentUserId && currentMembership.role !== "admin") {
      throw new HttpError(403, "FORBIDDEN", "Only an admin can remove another member.");
    }
    await prisma.groupMembership.delete({
      where: { groupId_userId: { groupId: id, userId } },
    }).catch(() => {
      throw new HttpError(404, "NOT_FOUND", "That member is not in the group.");
    });
    res.status(204).send();
  }),
);

export default router;