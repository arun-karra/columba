import { clearGroupEmoji } from '@/utils/groupEmoji';
import { clearGroupIconColor } from '@/utils/groupIconStyle';

export async function clearGroupLocalData(groupId: string): Promise<void> {
  await Promise.all([clearGroupEmoji(groupId), clearGroupIconColor(groupId)]);
}
