import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'columba-last-notification-icon-build';

/** iOS keeps old notification banners until dismissed; clear them after a native rebuild. */
export async function clearStaleNotificationsAfterNativeUpdate(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const buildId =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.version ??
    'unknown';

  try {
    const previous = await AsyncStorage.getItem(STORAGE_KEY);
    if (previous === buildId) return;

    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented.map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
    );

    await AsyncStorage.setItem(STORAGE_KEY, buildId);
  } catch {
    // best-effort
  }
}
