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

/** Short label on note cards when a scheduled reminder is set. */
export function getNoteNotificationStatus(note: NoteNotificationFields): string | null {
  if (note.isDone || !note.remindAt) return null;

  const remindAt = new Date(note.remindAt);
  if (note.reminderSentAt) return null;
  if (remindAt.getTime() <= Date.now()) return 'Sending soon';
  return `Reminds ${formatReminderStatus(remindAt)}`;
}
