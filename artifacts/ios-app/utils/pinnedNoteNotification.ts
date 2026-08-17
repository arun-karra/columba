import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MARK_COMPLETE_ACTION, PINNED_NOTE_CATEGORY } from './notifications';

type PinnedNote = {
  id: string;
  body: string;
  title?: string | null;
};

/**
 * Shows an immediate lock-screen notification for a pinned note.
 * Uses time-sensitive interruption (critical alerts need a separate Apple entitlement).
 */
export async function presentPinnedNoteNotification(note: PinnedNote): Promise<void> {
  if (Platform.OS !== 'ios') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: note.title?.trim() || 'Pinned note',
      body: note.body,
      data: { noteId: note.id },
      categoryIdentifier: PINNED_NOTE_CATEGORY,
      sound: 'default',
      interruptionLevel: 'timeSensitive',
    },
    trigger: null,
  });
}

export async function clearPinnedNoteNotification(noteId: string): Promise<void> {
  if (Platform.OS !== 'ios') return;

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
