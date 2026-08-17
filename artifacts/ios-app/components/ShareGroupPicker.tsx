import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
  type Group,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GroupAvatar } from '@/components/GroupAvatar';
import {
  defaultEmojiForGroup,
  getGroupEmojiMap,
  resolveGroupEmoji,
  setGroupEmoji,
} from '@/utils/groupEmoji';

const QUICK_PICK_LIMIT = 4;

type ShareGroupPickerProps = {
  selectedGroupId?: string | null;
  onSelect: (groupId: string, groupName: string) => void;
  /** Hide the built-in "Select Group" heading when nested in a section card. */
  showTitle?: boolean;
  /** When false, hide inline group creation (use Groups tab instead). */
  allowCreate?: boolean;
};

function GroupPill({
  group,
  emoji,
  selected,
  onPress,
}: {
  group: Group;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? colors.secondary : colors.muted,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Share with ${group.name}`}
    >
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text
        style={[styles.pillLabel, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {group.name}
      </Text>
      {selected ? (
        <AppIcon name="checkmark.circle.fill" size={16} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

export function ShareGroupPicker({
  selectedGroupId,
  onSelect,
  showTitle = true,
  allowCreate = true,
}: ShareGroupPickerProps) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [showFullList, setShowFullList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState<string>(defaultEmojiForGroup(''));

  const { data: groups = [], isLoading } = useListGroups();

  useEffect(() => {
    void getGroupEmojiMap().then(setEmojiMap);
  }, [groups.length]);

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: async (group) => {
        await setGroupEmoji(group.id, newGroupEmoji);
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
        setNewGroupName('');
        setNewGroupEmoji(defaultEmojiForGroup(''));
        setShowFullList(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSelect(group.id, group.name);
      },
    },
  });

  const pickGroup = (group: Group) => {
    Haptics.selectionAsync();
    onSelect(group.id, group.name);
  };

  const handleCreateGroup = async () => {
    const value = newGroupName.trim();
    if (!value) return;
    Keyboard.dismiss();
    try {
      await createGroup.mutateAsync({ data: { name: value, emoji: newGroupEmoji } });
    } catch {
      Alert.alert('Error', 'Could not create group. Try again.');
    }
  };

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }

  if (groups.length === 0 && !showCreate) {
    if (!allowCreate) {
      return (
        <View style={styles.emptyBlock}>
          <AppIcon name="person.2" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No groups yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Create a group in the Groups tab to share notes with family or friends.
          </Text>
          <Pressable
            style={[styles.groupsTabBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/groups');
            }}
          >
            <AppIcon name="person.2.fill" size={16} color={colors.primary} />
            <Text style={[styles.groupsTabBtnText, { color: colors.primary }]}>
              Go to Groups
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyBlock}>
        <AppIcon name="person.2" size={32} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No groups yet — create one to share notes.
        </Text>
        <Pressable
          style={[styles.createLink, { borderColor: colors.border }]}
          onPress={() => {
            setNewGroupEmoji(defaultEmojiForGroup(''));
            setShowCreate(true);
          }}
        >
          <AppIcon name="plus" size={16} color={colors.primary} />
          <Text style={[styles.createLinkText, { color: colors.primary }]}>
            Create a group
          </Text>
        </Pressable>
      </View>
    );
  }

  const quickGroups = groups.slice(0, QUICK_PICK_LIMIT);
  const hasMore = groups.length > QUICK_PICK_LIMIT;

  return (
    <View style={styles.root}>
      {showTitle ? (
        <Text style={[styles.title, { color: colors.foreground }]}>Select Group</Text>
      ) : null}

      {!showFullList ? (
        <>
          <View style={styles.grid}>
            {quickGroups.map((group) => {
              const emoji = resolveGroupEmoji(group.id, group.name, emojiMap, group.emoji);
              return (
                <GroupPill
                  key={group.id}
                  group={group}
                  emoji={emoji}
                  selected={group.id === selectedGroupId}
                  onPress={() => pickGroup(group)}
                />
              );
            })}
          </View>

          {hasMore ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowFullList(true);
              }}
              hitSlop={8}
            >
              <Text style={[styles.moreLink, { color: colors.primary }]}>More…</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={[styles.fullList, { borderColor: colors.border }]}>
          <Pressable
            onPress={() => setShowFullList(false)}
            style={styles.backRow}
            hitSlop={8}
          >
            <AppIcon name="chevron.left" size={14} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </Pressable>
          {groups.map((group, index) => {
            const emoji = resolveGroupEmoji(group.id, group.name, emojiMap, group.emoji);
            const initials = group.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? '')
              .join('');
            const isSelected = group.id === selectedGroupId;
            return (
              <Pressable
                key={group.id}
                style={({ pressed }) => [
                  styles.listRow,
                  index < groups.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => pickGroup(group)}
              >
                <GroupAvatar emoji={emoji} fallbackInitials={initials} size={36} />
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, { color: colors.foreground }]}>
                    {group.name}
                  </Text>
                  <Text style={[styles.listMeta, { color: colors.mutedForeground }]}>
                    {group.members.length}{' '}
                    {group.members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                {isSelected ? (
                  <AppIcon name="checkmark.circle.fill" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {allowCreate && showCreate ? (
        <View
          style={[
            styles.createCard,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.createLabel, { color: colors.foreground }]}>New group</Text>
          <EmojiPicker value={newGroupEmoji} onChange={setNewGroupEmoji} />
          <TextInput
            style={[
              styles.createInput,
              {
                backgroundColor: colors.card,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Group name"
            placeholderTextColor={colors.mutedForeground}
            value={newGroupName}
            onChangeText={setNewGroupName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleCreateGroup()}
          />
          <View style={styles.createActions}>
            <Pressable onPress={() => setShowCreate(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.createBtn,
                {
                  backgroundColor: newGroupName.trim()
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={() => void handleCreateGroup()}
              disabled={createGroup.isPending || !newGroupName.trim()}
            >
              {createGroup.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : allowCreate ? (
        <Pressable
          style={styles.createLink}
          onPress={() => {
            setNewGroupEmoji(defaultEmojiForGroup(''));
            setShowCreate(true);
          }}
        >
          <AppIcon name="plus" size={16} color={colors.primary} />
          <Text style={[styles.createLinkText, { color: colors.primary }]}>
            New group
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  title: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillEmoji: { fontSize: 18, lineHeight: 22 },
  pillLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  moreLink: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    paddingVertical: 4,
  },
  fullList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  listInfo: { flex: 1 },
  listName: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  listMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  emptyBlock: { alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  groupsTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupsTabBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  createLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  createLinkText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  createCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  createLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  createInput: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', padding: 8 },
  createBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
