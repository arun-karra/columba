import cron from "node-cron";
import { prisma } from "./prisma";
import { formatNoteNotificationText, resolveGroupEmoji } from "./groupEmoji";
import { sendPush } from "./push";
import { logger } from "./logger";

const PINNED_NOTE_CATEGORY = "PINNED_NOTE";

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
      const groupEmoji = note.group
        ? resolveGroupEmoji(note.group.emoji, note.group.name)
        : null;
      const text = formatNoteNotificationText(note.body, groupEmoji);

      await sendPush(
        userIds,
        text,
        { noteId: note.id },
        {
          pinned: note.isPinned,
          timeSensitive: true,
          ...(note.isPinned ? { categoryId: PINNED_NOTE_CATEGORY } : {}),
        },
      );
      await prisma.note.updateMany({
        where: { id: note.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
    }

    if (notes.length > 0) logger.info({ count: notes.length }, "Processed note reminders");
  });
}
