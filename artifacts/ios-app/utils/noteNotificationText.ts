import { resolveGroupEmoji } from '@/utils/groupEmoji';

export function resolveNoteGroupEmoji(
  groupId: string | null | undefined,
  groupName: string | null | undefined,
  emojiMap: Record<string, string>,
  serverGroupEmoji?: string | null,
): string | null {
  if (!groupId || !groupName) return null;
  return resolveGroupEmoji(groupId, groupName, emojiMap, serverGroupEmoji);
}

export function formatNoteNotificationText(
  body: string,
  groupId?: string | null,
  groupName?: string | null,
  emojiMap?: Record<string, string>,
  serverGroupEmoji?: string | null,
): string {
  const text = body.trim() || 'Note';
  const emoji = resolveNoteGroupEmoji(groupId, groupName, emojiMap ?? {}, serverGroupEmoji);
  if (emoji) return `${emoji} ${text}`;
  return text;
}
