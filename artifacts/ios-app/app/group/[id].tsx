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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
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
    <View
      style={[
        styles.memberRow,
        { borderBottomColor: colors.border },
      ]}
    >
      <View
        style={[styles.memberAvatar, { backgroundColor: colors.secondary }]}
      >
        <Text style={[styles.memberInitials, { color: colors.primary }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text
          style={[styles.memberEmail, { color: colors.foreground }]}
          numberOfLines={1}
        >
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
                  member.role === 'admin'
                    ? colors.primary
                    : colors.mutedForeground,
              },
            ]}
          >
            {member.role}
          </Text>
        </View>
      </View>
      {canRemove && (
        <Pressable onPress={onRemove} hitSlop={14}>
          <Feather name="user-minus" size={18} color={colors.destructive} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [inviteEmail, setInviteEmail] = useState('');

  const { data: group, isLoading } = useGetGroup(id ?? '');

  const inviteMutation = useInviteToGroup({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: getGetGroupQueryKey(id ?? ''),
        });
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
        queryClient.invalidateQueries({
          queryKey: getGetGroupQueryKey(id ?? ''),
        });
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
    } catch {
      Alert.alert('Error', 'Could not send invite. Please try again.');
    }
  };

  const handleRemove = (memberId: string, email: string) => {
    Alert.alert('Remove member', `Remove ${email} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await removeMutation.mutateAsync({
              id: id ?? '',
              memberId,
            });
          } catch {
            Alert.alert('Error', 'Could not remove member.');
          }
        },
      },
    ]);
  };

  const isAdmin =
    group?.members.find((m) => m.userId === user?.id)?.role === 'admin';

  if (isLoading || !group) {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={group.members}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 24,
          },
        ]}
        ListHeaderComponent={
          <>
            {/* Group header */}
            <View style={styles.groupHeader}>
              <View
                style={[
                  styles.groupAvatarLarge,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[
                    styles.groupAvatarText,
                    { color: colors.primary },
                  ]}
                >
                  {initials}
                </Text>
              </View>
              <Text style={[styles.groupName, { color: colors.foreground }]}>
                {group.name}
              </Text>
              <Text
                style={[styles.memberCount, { color: colors.mutedForeground }]}
              >
                {group.members.length}{' '}
                {group.members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {/* Invite card */}
            <View
              style={[
                styles.inviteCard,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.inviteCardHeader}>
                <Feather
                  name="user-plus"
                  size={15}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.inviteCardTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Invite a Member
                </Text>
              </View>
              <View style={styles.inviteRow}>
                <View
                  style={[
                    styles.inviteInputWrap,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Feather
                    name="mail"
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <TextInput
                    style={[
                      styles.inviteInput,
                      { color: colors.foreground },
                    ]}
                    placeholder="email@address.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleInvite}
                  />
                </View>
                <Pressable
                  style={[
                    styles.inviteBtn,
                    {
                      backgroundColor:
                        inviteEmail.includes('@')
                          ? colors.primary
                          : colors.card,
                    },
                  ]}
                  onPress={handleInvite}
                  disabled={
                    !inviteEmail.includes('@') || inviteMutation.isPending
                  }
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    <Feather
                      name="send"
                      size={16}
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

            {/* Members heading */}
            <Text
              style={[styles.membersLabel, { color: colors.mutedForeground }]}
            >
              MEMBERS
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            isMe={item.userId === user?.id}
            canRemove={isAdmin && item.userId !== user?.id}
            onRemove={() => handleRemove(item.userId, item.email)}
          />
        )}
        ItemSeparatorComponent={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 20, gap: 20, paddingTop: 16 },

  groupHeader: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  groupAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupAvatarText: { fontSize: 26, fontFamily: 'Manrope_700Bold' },
  groupName: { fontSize: 22, fontFamily: 'Manrope_700Bold' },
  memberCount: { fontSize: 13, fontFamily: 'Manrope_400Regular' },

  inviteCard: { padding: 18, gap: 14 },
  inviteCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteCardTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },

  inviteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inviteInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  inviteInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  membersLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 1,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
});
