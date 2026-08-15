/**
 * Notification helpers for Columba.
 *
 * Category/action identifiers must match what the backend sends as
 * `categoryIdentifier` in the Expo push payload.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PINNED_NOTE_CATEGORY = 'PINNED_NOTE';
export const MARK_COMPLETE_ACTION = 'MARK_COMPLETE';

/**
 * Dismiss any presented notification that carries the given noteId.
 * Safe to call unconditionally — no-ops on Android and web.
 */
export async function dismissNoteNotification(noteId: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => n.request.content.data?.noteId === noteId)
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
    );
  } catch {
    // silently ignore — dismissal is best-effort
  }
}
