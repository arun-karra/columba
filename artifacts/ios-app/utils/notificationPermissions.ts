import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Request iOS notification permission for local alerts (pin, reminders). */
export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requested.status === 'granted';
}
