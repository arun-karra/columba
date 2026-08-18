import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'columba-group-emojis';

/** Pick one emoji per group — shown on the Groups tab and group detail. */
export const GROUP_EMOJI_OPTIONS = [
  '🏠',
  '👨‍👩‍👧‍👦',
  '💼',
  '📚',
  '✈️',
  '🎉',
  '🍳',
  '🐶',
  '💪',
  '🎨',
  '🛒',
  '🌿',
  '⭐',
  '❤️',
  '🎵',
] as const;

/** Legacy quick picks — prefer `EmojiPicker` with the full emoji catalog. */
export const QUICK_GROUP_EMOJI_OPTIONS = ['🏠', '👥', '💼', '📚', '✈️', '🎉'] as const;

export type GroupEmoji = (typeof GROUP_EMOJI_OPTIONS)[number];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Stable default from group id — survives renames. Name seed is only for new-group UI previews. */
export function defaultEmojiForGroup(seed: string): GroupEmoji {
  const index = hashString(seed.trim().toLowerCase()) % GROUP_EMOJI_OPTIONS.length;
  return GROUP_EMOJI_OPTIONS[index]!;
}

export function defaultEmojiForGroupId(groupId: string): GroupEmoji {
  const index = hashString(groupId) % GROUP_EMOJI_OPTIONS.length;
  return GROUP_EMOJI_OPTIONS[index]!;
}

async function readMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getGroupEmoji(groupId: string): Promise<string | null> {
  const map = await readMap();
  return map[groupId] ?? null;
}

export async function getGroupEmojiMap(): Promise<Record<string, string>> {
  return readMap();
}

export async function setGroupEmoji(groupId: string, emoji: string): Promise<void> {
  const map = await readMap();
  map[groupId] = emoji;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function clearGroupEmoji(groupId: string): Promise<void> {
  const map = await readMap();
  if (!(groupId in map)) return;
  delete map[groupId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resolveGroupEmoji(
  groupId: string,
  _groupName: string,
  map: Record<string, string>,
  serverEmoji?: string | null,
): string {
  if (serverEmoji) return serverEmoji;
  return map[groupId] ?? defaultEmojiForGroupId(groupId);
}
