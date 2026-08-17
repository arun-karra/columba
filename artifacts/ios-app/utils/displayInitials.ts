/** Two-letter initials for avatars (profile, personal notes, etc.). */
export function getDisplayInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function resolveUserDisplayName(user: {
  displayName?: string | null;
  email?: string | null;
} | null): string {
  const saved = user?.displayName?.trim();
  if (saved) return saved;
  const fromEmail = user?.email?.split('@')[0]?.trim();
  if (fromEmail) return fromEmail;
  return 'User';
}

export function getUserDisplayInitials(user: {
  displayName?: string | null;
  email?: string | null;
} | null): string {
  return getDisplayInitials(resolveUserDisplayName(user));
}
