import { NativeModules, Platform, Share } from 'react-native';

function nativeExpoClipboardAvailable(): boolean {
  return Boolean((NativeModules as Record<string, unknown>).ExpoClipboard);
}

/** Copy text without loading expo-clipboard when the native module is absent. */
export async function copyText(text: string): Promise<'clipboard' | 'share'> {
  const trimmed = text.trim();
  if (!trimmed) return 'clipboard';

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(trimmed);
    return 'clipboard';
  }

  if (nativeExpoClipboardAvailable()) {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(trimmed);
      return 'clipboard';
    } catch {
      // Fall through to Share.
    }
  }

  await Share.share(
    Platform.OS === 'ios' ? { message: trimmed } : { message: trimmed, title: trimmed },
  );
  return 'share';
}
