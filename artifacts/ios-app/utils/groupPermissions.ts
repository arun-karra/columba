import type { Group } from '@workspace/api-client-react';

export function isGroupAdmin(group: Group, userId?: string | null): boolean {
  if (!userId) return false;
  return group.members.some((member) => member.userId === userId && member.role === 'admin');
}

/** Delete is admin-only and hidden when you are the sole remaining member. */
export function canDeleteGroup(group: Group, userId?: string | null): boolean {
  return isGroupAdmin(group, userId) && group.members.length > 1;
}
