import { resolveGroupEmoji } from '@/utils/groupEmoji';

export function formatNoteNotificationText(
  body: string,
  groupId?: string | null,
  groupName?: string | null,
  emojiMap?: Record<string, string>,
  serverGroupEmoji?: string | null,
): string {
  const text = body.trim() || 'Note';
  const emoji =
    serverGroupEmoji ??
    (groupId && groupName ? resolveGroupEmoji(groupId, groupName, emojiMap ?? {}) : null);
  if (emoji) return `${emoji} ${text}`;
  return text;
}
