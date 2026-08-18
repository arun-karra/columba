import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useGetGroup,
  useInviteToGroup,
  useRemoveGroupMember,
  useUpdateGroup,
  useDeleteGroup,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { GroupMember } from '@workspace/api-client-react';
import { AppIcon } from '@/components/AppIcon';
import { GroupAvatar } from '@/components/GroupAvatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { confirmDestructive } from '@/utils/iosConfirm';
import { ScreenGradient } from '@/components/ScreenGradient';
import { useScreenGutter } from '@/constants/layout';
import {
  defaultEmojiForGroup,
  setGroupEmoji,
} from '@/utils/groupEmoji';
import { defaultIconStyleForGroup } from '@/utils/emojiCatalog';
import {
  getGroupIconColor,
  setGroupIconColor,
} from '@/utils/groupIconStyle';
import { clearGroupLocalData } from '@/utils/clearGroupLocalData';
import { canDeleteGroup, isGroupAdmin } from '@/utils/groupPermissions';

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
  const [groupEmoji, setGroupEmojiState] = useState<string | null>(null);
  const [groupIconColor, setGroupIconColorState] = useState<string | null>(null);
  const [showEmojiEditor, setShowEmojiEditor] = useState(false);
  const [draftEmoji, setDraftEmoji] = useState<string>(defaultEmojiForGroup(''));
  const [draftIconColor, setDraftIconColor] = useState<string>(defaultIconStyleForGroup(''));

  const { data: group, isLoading } = useGetGroup(id ?? '');

  const updateGroup = useUpdateGroup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  useEffect(() => {
    if (!group) return;
    setGroupEmojiState(group.emoji);
    void getGroupIconColor(group.id).then((color) => {
      setGroupIconColorState(color ?? defaultIconStyleForGroup(group.name));
    });
  }, [group?.id, group?.emoji, group?.name]);

  const inviteMutation = useInviteToGroup({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setInviteEmail('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Invite sent', res.message);
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

  const deleteGroupMutation = useDeleteGroup({
    mutation: {
      onSuccess: () => {
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
        try {
          await removeMutation.mutateAsync({ id: id ?? '', userId: member.userId });
          if (isMe) {
            await clearGroupLocalData(id ?? '');
            router.back();
          }
        } catch {
          Alert.alert('Error', isMe ? 'Could not leave this group.' : 'Could not remove member.');
        }
      },
    });
  };

  const handleLeaveGroup = () => {
    if (!user?.id || !group) return;
    confirmDestructive({
      title: 'Leave group',
      message: `Leave "${group.name}"? You will lose access to its shared notes.`,
      confirmLabel: 'Leave',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          await removeMutation.mutateAsync({ id: id ?? '', userId: user.id });
          await clearGroupLocalData(id ?? '');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } catch {
          Alert.alert('Error', 'Could not leave this group. Please try again.');
        }
      },
    });
  };

  const handleDeleteGroup = () => {
    if (!group) return;
    confirmDestructive({
      title: 'Delete group',
      message: `Delete "${group.name}" for everyone? Members will lose access to shared notes in this group.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          await deleteGroupMutation.mutateAsync({ id: id ?? '' });
          await clearGroupLocalData(id ?? '');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } catch {
          Alert.alert('Error', 'Could not delete this group. Please try again.');
        }
      },
    });
  };

  if (isLoading || !group) {
    return (
      <ScreenGradient>
        <View style={styles.loadingRoot}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenGradient>
    );
  }

  const isAdmin = isGroupAdmin(group, user?.id);
  const showDeleteGroup = canDeleteGroup(group, user?.id);

  const groupInitials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const emoji = groupEmoji ?? group.emoji ?? defaultEmojiForGroup(group.name);
  const iconColor = groupIconColor ?? defaultIconStyleForGroup(group.name);

  const openEmojiEditor = () => {
    setDraftEmoji(emoji);
    setDraftIconColor(iconColor);
    setShowEmojiEditor(true);
  };

  const closeEmojiEditor = () => {
    setDraftEmoji(emoji);
    setDraftIconColor(iconColor);
    setShowEmojiEditor(false);
  };

  const saveEmoji = async () => {
    if (!id) return;
    await updateGroup.mutateAsync({ id, data: { emoji: draftEmoji } });
    await Promise.all([setGroupEmoji(id, draftEmoji), setGroupIconColor(id, draftIconColor)]);
    setGroupEmojiState(draftEmoji);
    setGroupIconColorState(draftIconColor);
    setShowEmojiEditor(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenGradient>
      <FlatList
        data={group.members}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter }]}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Pressable onPress={openEmojiEditor} style={styles.emojiTap}>
                <GroupAvatar
                  emoji={emoji}
                  fallbackInitials={groupInitials}
                  size={64}
                  backgroundColor={iconColor}
                />
                <Text style={[styles.changeEmoji, { color: colors.primary }]}>
                  Change icon
                </Text>
              </Pressable>
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
        ListFooterComponent={
          <View style={styles.dangerSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Group
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleLeaveGroup}
              style={({ pressed }) => [
                styles.dangerRow,
                {
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <AppIcon name="rectangle.portrait.and.arrow.right" size={18} color={colors.destructive} />
              <Text style={[styles.dangerLabel, { color: colors.destructive }]}>
                Leave Group
              </Text>
            </Pressable>
            {showDeleteGroup ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleDeleteGroup}
                style={({ pressed }) => [
                  styles.dangerRow,
                  {
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <AppIcon name="trash" size={18} color={colors.destructive} />
                <Text style={[styles.dangerLabel, { color: colors.destructive }]}>
                  Delete Group
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <Modal
        visible={showEmojiEditor}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={closeEmojiEditor}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
        <ScreenGradient>
          <View
            style={[
              styles.emojiModalHeader,
              {
                borderBottomColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Pressable onPress={closeEmojiEditor} hitSlop={14}>
              <Text style={[styles.emojiModalAction, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.groupName, { color: colors.foreground, fontSize: 17 }]}>
              Group icon
            </Text>
            <Pressable onPress={() => void saveEmoji()} hitSlop={14}>
              <Text style={[styles.emojiModalAction, styles.emojiModalActionRight, { color: colors.primary }]}>
                Save
              </Text>
            </Pressable>
          </View>
          <View style={styles.emojiModalBody}>
            <EmojiPicker
              variant="sheet"
              value={draftEmoji}
              onChange={setDraftEmoji}
              backgroundColor={draftIconColor}
              onBackgroundColorChange={setDraftIconColor}
            />
          </View>
        </ScreenGradient>
        </GestureHandlerRootView>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 48 },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    marginBottom: 8,
  },
  emojiTap: { alignItems: 'center', gap: 6 },
  changeEmoji: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  emojiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiModalAction: { fontSize: 17, fontFamily: 'Manrope_600SemiBold', width: 72 },
  emojiModalActionRight: { textAlign: 'right' },
  emojiModalBody: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  saveEmojiBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEmojiText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
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
  dangerSection: { marginTop: 28, gap: 8, paddingBottom: 24 },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  dangerLabel: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
});
