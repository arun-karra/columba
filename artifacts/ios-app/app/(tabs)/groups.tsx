import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useListGroups,
  useCreateGroup,
  useRemoveGroupMember,
  useDeleteGroup,
  useListGroupInvites,
  useAcceptGroupInvite,
  useDeclineGroupInvite,
  getListGroupsQueryKey,
  getListGroupInvitesQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { Group } from '@workspace/api-client-react';
import { AppIcon } from '@/components/AppIcon';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GroupAvatar } from '@/components/GroupAvatar';
import { GroupInvitesSection } from '@/components/GroupInvitesSection';
import { ScreenGradient } from '@/components/ScreenGradient';
import { confirmDestructive } from '@/utils/iosConfirm';
import { showApiErrorAlert } from '@/utils/apiError';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { FAB_SIZE, useFabBottom, useListBottomPadding, useScreenGutter } from '@/constants/layout';
import {
  defaultEmojiForGroup,
  getGroupEmojiMap,
  resolveGroupEmoji,
  setGroupEmoji,
} from '@/utils/groupEmoji';
import { defaultIconStyleForGroup } from '@/utils/emojiCatalog';
import {
  getGroupIconColorMap,
  resolveGroupIconColor,
  setGroupIconColor,
} from '@/utils/groupIconStyle';
import { clearGroupLocalData } from '@/utils/clearGroupLocalData';
import { canDeleteGroup } from '@/utils/groupPermissions';

function GroupCard({
  group,
  emoji,
  iconColor,
  onPress,
}: {
  group: Group;
  emoji: string;
  iconColor: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const initials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      onPress={onPress}
    >
      <GroupAvatar emoji={emoji} fallbackInitials={initials} backgroundColor={iconColor} />
      <View style={styles.cardContent}>
        <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <AppIcon name="chevron.right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const fabBottom = useFabBottom();
  const listBottom = useListBottomPadding(true);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(defaultEmojiForGroup(''));
  const [selectedIconColor, setSelectedIconColor] = useState<string>(
    defaultIconStyleForGroup(''),
  );
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [iconColorMap, setIconColorMap] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useListGroups({
    query: { queryKey: getListGroupsQueryKey(), enabled: !!user },
  });

  const { data: invites = [], isLoading: invitesLoading } = useListGroupInvites({
    query: { queryKey: getListGroupInvitesQueryKey(), enabled: !!user },
  });

  useEffect(() => {
    void Promise.all([getGroupEmojiMap(), getGroupIconColorMap()]).then(
      ([emojis, colors]) => {
        setEmojiMap(emojis);
        setIconColorMap(colors);
      },
    );
  }, [groups.length]);

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: async (group) => {
        await Promise.all([
          setGroupEmoji(group.id, selectedEmoji),
          setGroupIconColor(group.id, selectedIconColor),
        ]);
        setEmojiMap((prev) => ({ ...prev, [group.id]: selectedEmoji }));
        setIconColorMap((prev) => ({ ...prev, [group.id]: selectedIconColor }));
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
        setGroupName('');
        setSelectedEmoji(defaultEmojiForGroup(''));
        setSelectedIconColor(defaultIconStyleForGroup(''));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/group/${group.id}`);
      },
    },
  });

  const removeMember = useRemoveGroupMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const deleteGroup = useDeleteGroup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const acceptInvite = useAcceptGroupInvite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  const declineInvite = useDeclineGroupInvite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const handleLeaveGroup = (group: Group) => {
    if (!user?.id) return;
    confirmDestructive({
      title: 'Leave group',
      message: `Leave "${group.name}"? You will lose access to its shared notes.`,
      confirmLabel: 'Leave',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          await removeMember.mutateAsync({ id: group.id, userId: user.id });
          await clearGroupLocalData(group.id);
        } catch (e: unknown) {
          showApiErrorAlert(e, {
            title: 'Could not leave',
            fallbackMessage: 'Could not leave this group. Please try again.',
          });
        }
      },
    });
  };

  const handleDeleteGroup = (group: Group) => {
    confirmDestructive({
      title: 'Delete group',
      message: `Delete "${group.name}" for everyone? Members will lose access to shared notes in this group.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          await deleteGroup.mutateAsync({ id: group.id });
          await clearGroupLocalData(group.id);
        } catch (e: unknown) {
          showApiErrorAlert(e, {
            title: 'Could not delete',
            fallbackMessage: 'Could not delete this group. Please try again.',
          });
        }
      },
    });
  };

  const submitName = async (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createGroup.mutateAsync({ data: { name, emoji: selectedEmoji } });
    } catch (e: unknown) {
      showApiErrorAlert(e, {
        title: 'Could not create group',
        fallbackMessage: 'Could not create group. Please try again.',
      });
    }
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const seed = groupName.trim() || 'New Group';
    setSelectedEmoji(defaultEmojiForGroup(seed));
    setSelectedIconColor(defaultIconStyleForGroup(seed));
    setShowCreate(true);
  };

  const handleCreateFromModal = async () => {
    if (!groupName.trim()) return;
    await submitName(groupName.trim());
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() }),
      getGroupEmojiMap().then(setEmojiMap),
      getGroupIconColorMap().then(setIconColorMap),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const handleAcceptInvite = async (inviteId: string) => {
    setActingInviteId(inviteId);
    try {
      const result = await acceptInvite.mutateAsync({ id: inviteId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/group/${result.groupId}`);
    } catch (e: unknown) {
      showApiErrorAlert(e, {
        title: 'Could not accept',
        fallbackMessage: 'Could not accept this invitation. Please try again.',
      });
    } finally {
      setActingInviteId(null);
    }
  };

  const handleDeclineInvite = (inviteId: string) => {
    confirmDestructive({
      title: 'Decline invitation',
      message: 'Decline this group invitation?',
      confirmLabel: 'Decline',
      onConfirm: async () => {
        setActingInviteId(inviteId);
        try {
          await declineInvite.mutateAsync({ id: inviteId });
        } catch (e: unknown) {
          showApiErrorAlert(e, {
            title: 'Could not decline',
            fallbackMessage: 'Could not decline this invitation. Please try again.',
          });
        } finally {
          setActingInviteId(null);
        }
      },
    });
  };

  const isLoading = groupsLoading || invitesLoading;

  return (
    <ScreenGradient>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: gutter,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Groups</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: gutter }}>
            <GroupInvitesSection
              invites={invites}
              actingInviteId={actingInviteId}
              onAccept={(inviteId) => void handleAcceptInvite(inviteId)}
              onDecline={handleDeclineInvite}
            />
          </View>

          {groups.length === 0 ? (
            <View style={styles.center}>
              <AppIcon name="person.2" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No groups yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Create a group to share notes with family or friends
              </Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              contentContainerStyle={[
                styles.listContent,
                { paddingHorizontal: gutter, paddingBottom: listBottom },
              ]}
              contentInsetAdjustmentBehavior="automatic"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              ListHeaderComponent={
                <Text style={[styles.sectionTitle, styles.yourGroupsTitle, { color: colors.mutedForeground }]}>
                  Your Groups
                </Text>
              }
          renderItem={({ item }) => {
            const card = (
              <GroupCard
                group={item}
                emoji={resolveGroupEmoji(item.id, item.name, emojiMap, item.emoji)}
                iconColor={resolveGroupIconColor(item.id, item.name, iconColorMap)}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/group/${item.id}`);
                }}
              />
            );

            return (
              <Swipeable
                friction={2}
                overshootRight={false}
                renderRightActions={() => {
                  const showDelete = canDeleteGroup(item, user?.id);
                  return (
                    <View style={styles.swipeActions}>
                      {showDelete ? (
                        <Pressable
                          style={[styles.deleteAction, { backgroundColor: colors.destructive }]}
                          onPress={() => handleDeleteGroup(item)}
                        >
                          <AppIcon name="trash" size={18} color="#fff" />
                          <Text style={styles.swipeLabel}>Delete</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={[styles.leaveAction, { backgroundColor: colors.destructive }]}
                        onPress={() => handleLeaveGroup(item)}
                      >
                        <AppIcon name="rectangle.portrait.and.arrow.right" size={18} color="#fff" />
                        <Text style={styles.swipeLabel}>Leave</Text>
                      </Pressable>
                    </View>
                  );
                }}
                onSwipeableWillOpen={() => Haptics.selectionAsync()}
              >
                {card}
              </Swipeable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New group"
        onPress={handleCreatePress}
        style={[
          styles.fab,
          {
            bottom: fabBottom,
            right: gutter,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <AppIcon name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => {
          setShowCreate(false);
          setGroupName('');
          setSelectedIconColor(defaultIconStyleForGroup(''));
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
        <ScreenGradient>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12,
                paddingHorizontal: gutter,
                borderBottomColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                setShowCreate(false);
                setGroupName('');
                setSelectedIconColor(defaultIconStyleForGroup(''));
              }}
              hitSlop={14}
              accessibilityLabel="Cancel"
            >
              <AppIcon name="xmark" size={20} color={colors.primary} />
            </Pressable>
            <Text style={[styles.modalHeaderTitle, { color: colors.foreground }]}>
              New Group
            </Text>
            <Pressable
              onPress={() => void handleCreateFromModal()}
              hitSlop={14}
              disabled={createGroup.isPending || !groupName.trim()}
              accessibilityLabel="Create group"
            >
              {createGroup.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <AppIcon
                  name="checkmark"
                  size={22}
                  color={groupName.trim() ? colors.primary : colors.mutedForeground}
                />
              )}
            </Pressable>
          </View>

          <View style={[styles.modalBody, { paddingHorizontal: gutter }]}>
            <TextInput
              style={[styles.groupNameInput, { color: colors.foreground }]}
              placeholder="Group name"
              placeholderTextColor={colors.mutedForeground}
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                if (!text.trim()) {
                  setSelectedEmoji(defaultEmojiForGroup(''));
                  setSelectedIconColor(defaultIconStyleForGroup(''));
                }
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFromModal}
              maxLength={48}
            />
            <EmojiPicker
              variant="sheet"
              value={selectedEmoji}
              onChange={setSelectedEmoji}
              backgroundColor={selectedIconColor}
              onBackgroundColorChange={setSelectedIconColor}
            />
          </View>
        </ScreenGradient>
        </GestureHandlerRootView>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 8 },
  headerTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope_600SemiBold', marginTop: 6 },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  listContent: { paddingTop: 8 },
  listContentEmptyGroups: { flexGrow: 1 },
  inviteSection: { gap: 10, marginBottom: 18 },
  inviteList: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingLeft: 2,
  },
  yourGroupsTitle: { marginBottom: 8 },
  inlineEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  cardContent: { flex: 1 },
  groupName: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  memberCount: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderAction: { fontSize: 17, fontFamily: 'Manrope_600SemiBold', width: 72 },
  modalHeaderActionRight: { textAlign: 'right' },
  modalHeaderTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
  modalBody: { flex: 1, paddingTop: 12, paddingBottom: 8, gap: 8 },
  groupNameInput: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 16,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'Manrope_700Bold' },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  leaveAction: {
    width: 88,
    marginVertical: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 4,
  },
  deleteAction: {
    width: 88,
    marginVertical: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 4,
    opacity: 0.92,
  },
  swipeActions: { flexDirection: 'row' },
  swipeLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#fff' },
  leaveLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#fff' },
});
