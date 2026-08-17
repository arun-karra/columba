import type { PrismaClient } from "@prisma/client";

type DbClient = Pick<
  PrismaClient,
  "groupInvite" | "groupMembership"
>;

export async function acceptPendingInvitesForUser(
  tx: DbClient,
  user: { id: string; email: string | null },
) {
  if (!user.email) return;

  const invites = await tx.groupInvite.findMany({
    where: { email: user.email, status: "pending" },
  });

  for (const invite of invites) {
    await tx.groupMembership.upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
      update: {},
      create: { groupId: invite.groupId, userId: user.id, role: "member" },
    });
    await tx.groupInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });
  }
}
