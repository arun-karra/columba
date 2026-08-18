import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultIconStyleForGroup, defaultIconStyleForGroupId, type GroupIconStyleColor } from '@/utils/emojiCatalog';

const STORAGE_KEY = 'columba-group-icon-colors';
const RECENT_EMOJI_KEY = 'columba-recent-emojis';
const MAX_RECENT = 40;

async function readColorMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getGroupIconColorMap(): Promise<Record<string, string>> {
  return readColorMap();
}

export async function getGroupIconColor(groupId: string): Promise<string | null> {
  const map = await readColorMap();
  return map[groupId] ?? null;
}

export async function setGroupIconColor(groupId: string, color: string): Promise<void> {
  const map = await readColorMap();
  map[groupId] = color;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function clearGroupIconColor(groupId: string): Promise<void> {
  const map = await readColorMap();
  if (!(groupId in map)) return;
  delete map[groupId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resolveGroupIconColor(
  groupId: string,
  _groupName: string,
  map: Record<string, string>,
): GroupIconStyleColor {
  return (map[groupId] as GroupIconStyleColor | undefined) ?? defaultIconStyleForGroupId(groupId);
}

export async function getRecentEmojis(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENT_EMOJI_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function rememberRecentEmoji(emoji: string): Promise<void> {
  const normalized = emoji.normalize('NFC');
  if (!normalized) return;
  const recent = await getRecentEmojis();
  const next = [normalized, ...recent.filter((item) => item !== normalized)].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
}
