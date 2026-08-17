import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureLocalNotificationPermission } from './notificationPermissions';
import { formatNoteNotificationText } from './noteNotificationText';
import { getGroupEmojiMap } from '@/utils/groupEmoji';
import { MARK_COMPLETE_ACTION, PINNED_NOTE_CATEGORY } from './notifications';

type PinnedNote = {
  id: string;
  body: string;
  groupId?: string | null;
  groupName?: string | null;
  groupEmoji?: string | null;
};

function pinnedNotificationId(noteId: string): string {
  return `pinned-note-${noteId}`;
}

/**
 * Shows an immediate lock-screen notification for a pinned note.
 * Uses a single title line (note text, optionally prefixed with group emoji).
 */
export async function presentPinnedNoteNotification(note: PinnedNote): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  const granted = await ensureLocalNotificationPermission();
  if (!granted) return false;

  const emojiMap = note.groupId ? await getGroupEmojiMap() : {};
  const title = formatNoteNotificationText(
    note.body,
    note.groupId,
    note.groupName,
    emojiMap,
    note.groupEmoji,
  );

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: pinnedNotificationId(note.id),
      content: {
        title,
        body: '',
        data: { noteId: note.id },
        categoryIdentifier: PINNED_NOTE_CATEGORY,
        sound: 'default',
        interruptionLevel: 'timeSensitive',
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearPinnedNoteNotification(noteId: string): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(pinnedNotificationId(noteId));
  } catch {
    // best-effort
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.noteId === noteId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((n) => n.request.content.data?.noteId === noteId)
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  );
}

export { MARK_COMPLETE_ACTION, PINNED_NOTE_CATEGORY };
