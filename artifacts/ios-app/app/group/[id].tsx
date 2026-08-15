import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
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

// ─── Member Row ───────────────────────────────────────────────────────────────

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
    <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.memberAvatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.memberInitials, { color: colors.secondaryForeground }]}>
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
                member.role === 'admin' ? colors.primary + '22' : colors.muted,
              borderRadius: 4,
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
      {canRemove && (
        <Pressable onPress={onRemove} hitSlop={14}>
          {Platform.OS === 'ios' ? (
            <SymbolView name="person.badge.minus" tintColor={colors.destructive} size={20} />
          ) : (
            <Feather name="user-minus" size={20} color={colors.destructive} />
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const colors = useColors();
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
    Alert.alert(
      isMe ? 'Leave group' : 'Remove member',
      isMe
        ? 'Are you sure you want to leave this group?'
        : `Remove ${member.email} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isMe ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await removeMutation.mutateAsync({ id: id ?? '', userId: member.userId });
            if (isMe) router.back();
          },
        },
      ],
    );
  };

  if (isLoading || !group) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const myMembership = group.members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'admin';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={group.members}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Group avatar + name */}
            <View style={styles.groupHeader}>
              <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.groupAvatarText, { color: colors.primaryForeground }]}>
                  {group.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('')}
                </Text>
              </View>
              <Text style={[styles.groupName, { color: colors.foreground }]}>
                {group.name}
              </Text>
              <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
                {group.members.length}{' '}
                {group.members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {/* Invite */}
            <View
              style={[
                styles.inviteCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
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
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: colors.radius / 2,
                      flex: 1,
                    },
                  ]}
                  placeholder="their@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleInvite}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.inviteBtn,
                    {
                      backgroundColor: inviteEmail.includes('@')
                        ? colors.primary
                        : colors.muted,
                      borderRadius: colors.radius / 2,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={handleInvite}
                  disabled={inviteMutation.isPending || !inviteEmail.includes('@')}
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : Platform.OS === 'ios' ? (
                    <SymbolView
                      name="person.badge.plus"
                      tintColor={
                        inviteEmail.includes('@')
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                      size={18}
                    />
                  ) : (
                    <Feather
                      name="user-plus"
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },

  groupHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { fontSize: 28, fontFamily: 'Manrope_700Bold' },
  groupName: { fontSize: 24, fontFamily: 'Manrope_700Bold' },
  memberCount: { fontSize: 14, fontFamily: 'Manrope_400Regular' },

  inviteCard: { padding: 16, borderWidth: 1, gap: 12, marginBottom: 24 },
  inviteLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  inviteRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inviteInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
  },
  inviteBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
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
  memberEmail: { fontSize: 14, fontFamily: 'Manrope_500Medium' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
});
