import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useGetGroup,
  useInviteToGroup,
  useRemoveGroupMember,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { GroupMember } from '@workspace/api-client-react';
import { AppIcon } from '@/components/AppIcon';
import { confirmDestructive } from '@/utils/iosConfirm';
import { useScreenGutter } from '@/constants/layout';

function MemberRow({
  member,
  isMe,
  canRemove,
  onRemove,
}: {
  member: GroupMember;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const colors = useColors();
  const initials = member.email.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
      <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.memberInitials, { color: colors.primaryForeground }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberEmail, { color: colors.foreground }]} numberOfLines={1}>
          {member.email}
          {isMe ? ' (you)' : ''}
        </Text>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor:
                member.role === 'admin' ? colors.secondary : colors.muted,
            },
          ]}
        >
          <Text
            style={[
              styles.roleText,
              {
                color:
                  member.role === 'admin' ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {member.role}
          </Text>
        </View>
      </View>
      {canRemove ? (
        <Pressable onPress={onRemove} hitSlop={14} accessibilityLabel={isMe ? 'Leave group' : 'Remove member'}>
          <AppIcon name="person.badge.minus" size={20} color={colors.destructive} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function GroupDetailScreen() {
  const colors = useColors();
  const gutter = useScreenGutter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [inviteEmail, setInviteEmail] = useState('');

  const { data: group, isLoading } = useGetGroup(id ?? '');

  const inviteMutation = useInviteToGroup({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setInviteEmail('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          res.status === 'added' ? 'Added!' : 'Invite sent',
          res.message,
        );
      },
    },
  });

  const removeMutation = useRemoveGroupMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await inviteMutation.mutateAsync({
        id: id ?? '',
        data: { email: inviteEmail.trim().toLowerCase() },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not send invitation.';
      Alert.alert('Error', msg);
    }
  };

  const handleRemove = (member: GroupMember) => {
    const isMe = member.userId === user?.id;
    confirmDestructive({
      title: isMe ? 'Leave group' : 'Remove member',
      message: isMe
        ? 'Are you sure you want to leave this group?'
        : `Remove ${member.email} from the group?`,
      confirmLabel: isMe ? 'Leave' : 'Remove',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await removeMutation.mutateAsync({ id: id ?? '', userId: member.userId });
        if (isMe) router.back();
      },
    });
  };

  if (isLoading || !group) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const myMembership = group.members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'admin';

  const groupInitials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={group.members}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter }]}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={[styles.groupAvatarWrap, { backgroundColor: colors.primary }]}>
                <Text style={[styles.groupAvatarText, { color: colors.primaryForeground }]}>
                  {groupInitials}
                </Text>
              </View>
              <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
              <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
                {group.members.length}{' '}
                {group.members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>

            <View
              style={[
                styles.inviteCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.inviteLabel, { color: colors.foreground }]}>
                Invite someone
              </Text>
              <View style={styles.inviteRow}>
                <TextInput
                  style={[
                    styles.inviteInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="their@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleInvite}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send invite"
                  style={[
                    styles.inviteBtn,
                    {
                      backgroundColor: inviteEmail.includes('@')
                        ? colors.primary
                        : colors.secondary,
                    },
                  ]}
                  onPress={handleInvite}
                  disabled={inviteMutation.isPending || !inviteEmail.includes('@')}
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <AppIcon
                      name="person.badge.plus"
                      size={18}
                      color={
                        inviteEmail.includes('@')
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                    />
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Members
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            isMe={item.userId === user?.id}
            canRemove={isAdmin || item.userId === user?.id}
            onRemove={() => handleRemove(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 48 },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    marginBottom: 8,
  },
  groupAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupAvatarText: { fontSize: 28, fontFamily: 'Manrope_700Bold' },
  groupName: { fontSize: 22, fontFamily: 'Manrope_700Bold' },
  memberCount: { fontSize: 15, fontFamily: 'Manrope_400Regular' },

  inviteCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  inviteLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  inviteRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inviteInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberInitials: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  memberInfo: { flex: 1, gap: 4 },
  memberEmail: { fontSize: 16, fontFamily: 'Manrope_500Medium' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' },
});
