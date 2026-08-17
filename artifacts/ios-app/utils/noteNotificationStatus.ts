import type { Note } from '@workspace/api-client-react';
import { formatReminderStatus } from '@/utils/reminderSchedule';

type NoteNotificationFields = Pick<
  Note,
  'isPinned' | 'isDone' | 'remindAt' | 'reminderSentAt'
>;

export function noteHasActiveNotification(
  note: Pick<Note, 'isPinned' | 'isDone' | 'remindAt'>,
): boolean {
  if (note.isDone) return false;
  return note.isPinned || !!note.remindAt;
}

/** Short label shown on home note cards for pinned/scheduled notifications. */
export function getNoteNotificationStatus(note: NoteNotificationFields): string | null {
  if (note.isDone) return null;
  if (!note.isPinned && !note.remindAt) return null;

  if (note.remindAt) {
    const remindAt = new Date(note.remindAt);
    if (note.reminderSentAt) return 'Reminder sent';
    if (remindAt.getTime() <= Date.now()) return 'Sending soon';
    return `Reminds ${formatReminderStatus(remindAt)}`;
  }

  if (note.isPinned) return 'On lock screen now';
  return null;
}
