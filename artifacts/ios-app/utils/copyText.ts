import { Platform, Share } from 'react-native';

/** Copy text without importing native clipboard at module load (dev client may predate expo-clipboard). */
export async function copyText(text: string): Promise<'clipboard' | 'share'> {
  const trimmed = text.trim();
  if (!trimmed) return 'clipboard';

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(trimmed);
    return 'clipboard';
  }

  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(trimmed);
    return 'clipboard';
  } catch {
    await Share.share(
      Platform.OS === 'ios' ? { message: trimmed } : { message: trimmed, title: trimmed },
    );
    return 'share';
  }
}
