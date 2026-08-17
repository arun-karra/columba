import type { Note } from '@workspace/api-client-react';

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

function formatRelativeReminder(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 'soon';

  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `in ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hr`;

  return `on ${target.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/** Short label shown on home note cards for pinned/scheduled notifications. */
export function getNoteNotificationStatus(note: NoteNotificationFields): string | null {
  if (note.isDone) return null;
  if (!note.isPinned && !note.remindAt) return null;

  if (note.remindAt) {
    const remindAt = new Date(note.remindAt);
    if (note.reminderSentAt) return 'Reminder sent';
    if (remindAt.getTime() <= Date.now()) return 'Sending soon';
    return `Reminds ${formatRelativeReminder(remindAt)}`;
  }

  if (note.isPinned) return 'On lock screen now';
  return null;
}
