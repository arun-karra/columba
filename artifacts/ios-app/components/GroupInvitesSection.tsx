import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import type { GroupInvite } from '@workspace/api-client-react';
import { AppIcon } from '@/components/AppIcon';
import { GroupInviteCard } from '@/components/GroupInviteCard';
import { useColors } from '@/hooks/useColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GroupInvitesSectionProps = {
  invites: GroupInvite[];
  actingInviteId: string | null;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
};

export function GroupInvitesSection({
  invites,
  actingInviteId,
  onAccept,
  onDecline,
}: GroupInvitesSectionProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const count = invites.length;
  const hasInvites = count > 0;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((open) => !open);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Group invitations, ${count} pending`}
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.headerRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.88 : 1,
            borderBottomLeftRadius: expanded && hasInvites ? 0 : 16,
            borderBottomRightRadius: expanded && hasInvites ? 0 : 16,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <AppIcon name="envelope" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Invitations</Text>
          {count > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{count}</Text>
            </View>
          ) : null}
        </View>
        <AppIcon
          name={expanded ? 'chevron.up' : 'chevron.down'}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {expanded ? (
        <View
          style={[
            styles.body,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderTopWidth: hasInvites ? 0 : StyleSheet.hairlineWidth,
              marginTop: hasInvites ? -1 : 8,
              borderTopLeftRadius: hasInvites ? 0 : 16,
              borderTopRightRadius: hasInvites ? 0 : 16,
            },
          ]}
        >
          {count === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <AppIcon name="tray" size={22} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No pending invitations
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                When someone invites you to a group, it will show up here.
              </Text>
            </View>
          ) : (
            <View style={styles.inviteList}>
              {invites.map((invite) => (
                <GroupInviteCard
                  key={invite.id}
                  invite={invite}
                  loading={actingInviteId === invite.id}
                  onAccept={() => onAccept(invite.id)}
                  onDecline={() => onDecline(invite.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0, marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  body: {
    marginTop: -1,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    maxWidth: 280,
  },
  inviteList: { gap: 10, padding: 10 },
});
