import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { GroupInvite } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { GroupAvatar } from '@/components/GroupAvatar';
import { defaultIconStyleForGroupId } from '@/utils/emojiCatalog';

type Props = {
  invite: GroupInvite;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function GroupInviteCard({ invite, loading, onAccept, onDecline }: Props) {
  const colors = useColors();
  const initials = invite.groupName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  const inviter =
    invite.invitedByName?.trim() ||
    invite.invitedByEmail?.split('@')[0] ||
    'Someone';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <GroupAvatar
        emoji={invite.groupEmoji}
        fallbackInitials={initials}
        size={44}
        backgroundColor={defaultIconStyleForGroupId(invite.groupId)}
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {invite.groupName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
          {inviter} invited you to join
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decline invite to ${invite.groupName}`}
          disabled={loading}
          onPress={() => {
            Haptics.selectionAsync();
            onDecline();
          }}
          style={({ pressed }) => [
            styles.declineBtn,
            {
              borderColor: colors.border,
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.declineText, { color: colors.mutedForeground }]}>Decline</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Accept invite to ${invite.groupName}`}
          disabled={loading}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          style={({ pressed }) => [
            styles.acceptBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading ? 0.82 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.acceptText, { color: colors.primaryForeground }]}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  declineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  declineText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  acceptBtn: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
});
