import cron from "node-cron";
import { prisma } from "./prisma";
import { sendPush } from "./push";
import { logger } from "./logger";

export function startReminderScheduler() {
  cron.schedule("* * * * *", async () => {
    const notes = await prisma.note.findMany({
      where: {
        remindAt: { lte: new Date() },
        reminderSentAt: null,
        isDone: false,
      },
      include: {
        group: { include: { memberships: { select: { userId: true } } } },
      },
    });

    for (const note of notes) {
      const userIds = note.group
        ? note.group.memberships.map((membership) => membership.userId)
        : [note.ownerId];
      await sendPush(
        userIds,
        note.isUrgent ? "Urgent note reminder" : "Note reminder",
        note.title || note.body.slice(0, 120),
        { noteId: note.id },
        note.isUrgent,
      );
      await prisma.note.updateMany({
        where: { id: note.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
    }

    if (notes.length > 0) logger.info({ count: notes.length }, "Processed note reminders");
  });
}