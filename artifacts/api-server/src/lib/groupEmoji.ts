const GROUP_EMOJI_OPTIONS = [
  "🏠",
  "👨‍👩‍👧‍👦",
  "💼",
  "📚",
  "✈️",
  "🎉",
  "🍳",
  "🐶",
  "💪",
  "🎨",
  "🛒",
  "🌿",
  "⭐",
  "❤️",
  "🎵",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Stable default from group id — survives renames. */
export function defaultEmojiForGroup(groupId: string): string {
  const index = hashString(groupId) % GROUP_EMOJI_OPTIONS.length;
  return GROUP_EMOJI_OPTIONS[index]!;
}

export function resolveGroupEmoji(
  emoji: string | null | undefined,
  groupId: string | null | undefined,
): string | null {
  if (emoji) return emoji;
  if (groupId) return defaultEmojiForGroup(groupId);
  return null;
}

export function formatNoteNotificationText(
  body: string,
  groupEmoji: string | null | undefined,
): string {
  const text = body.trim();
  if (!text) return "Note";
  if (groupEmoji) return `${groupEmoji} ${text}`;
  return text;
}
