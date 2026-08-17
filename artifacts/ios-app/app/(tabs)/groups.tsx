import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { Group } from '@workspace/api-client-react';
import { AppIcon } from '@/components/AppIcon';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GroupAvatar } from '@/components/GroupAvatar';
import { FAB_SIZE, useFabBottom, useListBottomPadding, useScreenGutter } from '@/constants/layout';
import {
  defaultEmojiForGroup,
  getGroupEmojiMap,
  resolveGroupEmoji,
  setGroupEmoji,
} from '@/utils/groupEmoji';

function GroupCard({
  group,
  emoji,
  onPress,
}: {
  group: Group;
  emoji: string;
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
      <GroupAvatar emoji={emoji} fallbackInitials={initials} />
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
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const { data: groups = [], isLoading } = useListGroups({
    query: { queryKey: getListGroupsQueryKey(), enabled: !!user },
  });

  useEffect(() => {
    void getGroupEmojiMap().then(setEmojiMap);
  }, [groups.length]);

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: async (group) => {
        await setGroupEmoji(group.id, selectedEmoji);
        setEmojiMap((prev) => ({ ...prev, [group.id]: selectedEmoji }));
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
        setGroupName('');
        setSelectedEmoji(defaultEmojiForGroup(''));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/group/${group.id}`);
      },
    },
  });

  const submitName = async (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createGroup.mutateAsync({ data: { name } });
    } catch {
      Alert.alert('Error', 'Could not create group. Please try again.');
    }
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedEmoji(defaultEmojiForGroup(groupName || 'New Group'));
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
      getGroupEmojiMap().then(setEmojiMap),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
      ) : groups.length === 0 ? (
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
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              emoji={resolveGroupEmoji(item.id, item.name, emojiMap)}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/group/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
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
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setShowCreate(false);
            setGroupName('');
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={() => undefined}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              New Group
            </Text>
            <EmojiPicker
              value={selectedEmoji}
              onChange={setSelectedEmoji}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Household, Book Club…"
              placeholderTextColor={colors.mutedForeground}
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                if (!text.trim()) {
                  setSelectedEmoji(defaultEmojiForGroup(''));
                }
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFromModal}
            />
            <View style={styles.sheetActions}>
              <Pressable
                style={[
                  styles.sheetBtn,
                  {
                    backgroundColor: groupName.trim()
                      ? colors.primary
                      : colors.secondary,
                    flex: 1,
                  },
                ]}
                onPress={handleCreateFromModal}
                disabled={createGroup.isPending || !groupName.trim()}
              >
                {createGroup.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.sheetBtnText,
                      {
                        color: groupName.trim()
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
});
