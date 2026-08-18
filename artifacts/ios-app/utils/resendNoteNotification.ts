import { Alert } from 'react-native';
import { resendNoteNotification as resendNoteNotificationApi } from '@workspace/api-client-react';
import type { Note } from '@workspace/api-client-react';
import { ensureLocalNotificationPermission } from '@/utils/notificationPermissions';
import { presentPinnedNoteNotification } from '@/utils/pinnedNoteNotification';
import { noteHasActiveNotification } from '@/utils/noteNotificationStatus';
import { showApiErrorAlert } from '@/utils/apiError';

export function canResendNoteNotification(
  note: Pick<Note, 'isPinned' | 'isDone' | 'remindAt'>,
): boolean {
  return noteHasActiveNotification(note);
}

export async function resendNoteNotification(note: Note): Promise<boolean> {
  if (!canResendNoteNotification(note)) return false;

  const granted = await ensureLocalNotificationPermission();
  if (!granted) {
    Alert.alert(
      'Notifications needed',
      'Allow notifications in Settings to show notes on your lock screen.',
    );
    return false;
  }

  try {
    await resendNoteNotificationApi(note.id);
  } catch (e: unknown) {
    showApiErrorAlert(e, {
      title: 'Could not resend',
      fallbackMessage: 'Could not resend the notification. Please try again.',
    });
    return false;
  }

  const shown = await presentPinnedNoteNotification({
    id: note.id,
    body: note.body,
    groupId: note.groupId,
    groupName: note.groupName,
    groupEmoji: note.groupEmoji,
  });

  if (!shown) {
    Alert.alert(
      'Notifications needed',
      'Allow notifications in Settings to show notes on your lock screen.',
    );
    return false;
  }

  return true;
}
