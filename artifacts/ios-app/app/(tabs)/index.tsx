import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  useListNotes,
  useDeleteNote,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
  type Note,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/AppIcon';
import { GroupAvatar } from '@/components/GroupAvatar';
import { confirmDestructive } from '@/utils/iosConfirm';
import { FAB_SIZE, useFabBottom, useListBottomPadding, useScreenGutter } from '@/constants/layout';
import { getGroupEmojiMap } from '@/utils/groupEmoji';
import { getGroupIconColorMap, resolveGroupIconColor } from '@/utils/groupIconStyle';
import { resolveNoteGroupEmoji } from '@/utils/noteNotificationText';
import { clearPinnedNoteNotification } from '@/utils/pinnedNoteNotification';
import { dismissNoteNotification } from '@/utils/notifications';

function NoteCardContent({
  note,
  groupEmoji,
  groupIconColor,
  groupName,
  selectionMode,
  selected,
}: {
  note: Note;
  groupEmoji: string | null;
  groupIconColor: string | null;
  groupName: string | null;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const colors = useColors();
  const isDone = note.isDone;
  const groupInitials = groupName
    ? groupName
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')
    : '';

  return (
    <>
      {selectionMode ? (
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
            },
          ]}
        >
          {selected ? (
            <AppIcon name="checkmark" size={14} color={colors.primaryForeground} />
          ) : null}
        </View>
      ) : null}
      <View style={styles.cardInner}>
        {groupEmoji && groupName ? (
          <GroupAvatar
            emoji={groupEmoji}
            fallbackInitials={groupInitials}
            size={32}
            backgroundColor={groupIconColor}
          />
        ) : null}
        <Text
          style={[
            styles.cardText,
            {
              color: colors.foreground,
              textDecorationLine: isDone ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {note.body}
        </Text>
      </View>
      {!selectionMode ? (
        <AppIcon name="chevron.right" size={16} color={colors.mutedForeground} />
      ) : null}
    </>
  );
}

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const fabBottom = useFabBottom();
  const listBottom = useListBottomPadding(true);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [iconColorMap, setIconColorMap] = useState<Record<string, string>>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const openSwipeRef = useRef<Swipeable | null>(null);

  const { data: notes = [], isLoading, refetch } = useListNotes({
    query: { queryKey: getListNotesQueryKey(), enabled: !!user },
  });

  const toggleDone = useToggleNoteDone();
  const deleteNote = useDeleteNote();

  useEffect(() => {
    void Promise.all([getGroupEmojiMap(), getGroupIconColorMap()]).then(
      ([emojis, colors]) => {
        setEmojiMap(emojis);
        setIconColorMap(colors);
      },
    );
  }, [notes.length]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
  }, [queryClient]);

  const onRefresh = useCallback(async () => {
    await invalidate();
    await Promise.all([
      getGroupEmojiMap().then(setEmojiMap),
      getGroupIconColorMap().then(setIconColorMap),
    ]);
  }, [invalidate]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handlePress = useCallback(
    (note: Note) => {
      if (selectionMode) {
        Haptics.selectionAsync();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(note.id)) next.delete(note.id);
          else next.add(note.id);
          return next;
        });
        return;
      }
      Haptics.selectionAsync();
      router.push(`/note/${note.id}`);
    },
    [selectionMode],
  );

  const handleDelete = useCallback(
    (note: Note) => {
      openSwipeRef.current?.close();
      confirmDestructive({
        title: 'Delete note',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        onConfirm: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await deleteNote.mutateAsync({ id: note.id });
            await clearPinnedNoteNotification(note.id);
            await dismissNoteNotification(note.id);
            await invalidate();
          } catch {
            // best-effort
          }
        },
      });
    },
    [deleteNote, invalidate],
  );

  const handleToggleDone = useCallback(
    async (note: Note) => {
      openSwipeRef.current?.close();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        await toggleDone.mutateAsync({ id: note.id });
        if (note.isPinned && !note.isDone) {
          await clearPinnedNoteNotification(note.id);
          await dismissNoteNotification(note.id);
        }
        await invalidate();
      } catch {
        Alert.alert('Error', 'Could not update this note.');
      }
    },
    [toggleDone, invalidate],
  );

  const handleMarkSelectedDone = useCallback(async () => {
    const targets = notes.filter((n) => selectedIds.has(n.id) && !n.isDone);
    if (targets.length === 0) {
      Alert.alert('Nothing to mark', 'Selected notes are already done.');
      return;
    }

    setBatchLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Promise.all(
        targets.map(async (note) => {
          await toggleDone.mutateAsync({ id: note.id });
          if (note.isPinned) {
            await clearPinnedNoteNotification(note.id);
            await dismissNoteNotification(note.id);
          }
        }),
      );
      await invalidate();
      exitSelectionMode();
    } catch {
      Alert.alert('Error', 'Could not mark all selected notes as done.');
    } finally {
      setBatchLoading(false);
    }
  }, [notes, selectedIds, toggleDone, invalidate, exitSelectionMode]);

  const openNotes = notes.filter((n) => !n.isDone);
  const canSelect = openNotes.length > 0;

  const selectionBarBottom = fabBottom + FAB_SIZE + 16;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: gutter,
            backgroundColor: colors.background,
          },
        ]}
      >
        {selectionMode ? (
          <View style={styles.headerRow}>
            <Pressable onPress={exitSelectionMode} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitleCompact, { color: colors.foreground }]}>
              {selectedIds.size} selected
            </Text>
            <Pressable
              onPress={() => {
                if (selectedIds.size === openNotes.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(openNotes.map((n) => n.id)));
                }
                Haptics.selectionAsync();
              }}
              hitSlop={8}
            >
              <Text style={[styles.headerAction, { color: colors.primary }]}>
                {selectedIds.size === openNotes.length && openNotes.length > 0
                  ? 'Clear'
                  : 'All'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
            {canSelect ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectionMode(true);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Select notes"
              >
                <Text style={[styles.headerAction, { color: colors.primary }]}>Select</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        extraData={{ selectionMode, selectedIds, emojiMap, iconColorMap }}
        renderItem={({ item }) => {
          const groupEmoji = resolveNoteGroupEmoji(
            item.groupId,
            item.groupName,
            emojiMap,
            item.groupEmoji,
          );
          const groupIconColor =
            item.groupId && item.groupName
              ? resolveGroupIconColor(item.groupId, item.groupName, iconColorMap)
              : null;

          const isSelected = selectedIds.has(item.id);

          const card = (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.82 : item.isDone ? 0.55 : 1,
                  borderWidth: selectionMode && isSelected ? 2 : 0,
                  borderColor: selectionMode && isSelected ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => handlePress(item)}
            >
              <NoteCardContent
                note={item}
                groupEmoji={groupEmoji}
                groupIconColor={groupIconColor}
                groupName={item.groupName}
                selectionMode={selectionMode}
                selected={isSelected}
              />
            </Pressable>
          );

          if (selectionMode) return card;

          const renderLeftActions = () => (
            <Pressable
              style={[
                styles.swipeAction,
                {
                  backgroundColor: colors.secondary,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => void handleToggleDone(item)}
            >
              <AppIcon
                name={item.isDone ? 'arrow.counterclockwise' : 'checkmark'}
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.swipeLabel, { color: colors.primary }]}>
                {item.isDone ? 'Undo' : 'Done'}
              </Text>
            </Pressable>
          );

          const renderRightActions = () => (
            <Pressable
              style={[styles.swipeAction, { backgroundColor: colors.destructive }]}
              onPress={() => handleDelete(item)}
            >
              <AppIcon name="trash.fill" size={20} color="#fff" />
              <Text style={[styles.swipeLabel, { color: '#fff' }]}>Delete</Text>
            </Pressable>
          );

          return (
            <Swipeable
              ref={(ref) => {
                if (ref) openSwipeRef.current = ref;
              }}
              friction={2}
              overshootLeft={false}
              overshootRight={false}
              renderLeftActions={renderLeftActions}
              renderRightActions={renderRightActions}
              onSwipeableWillOpen={() => Haptics.selectionAsync()}
            >
              {card}
            </Swipeable>
          );
        }}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: gutter,
            paddingBottom: selectionMode ? selectionBarBottom + 72 : listBottom,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <AppIcon name="doc.text" size={40} color={colors.secondary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No notes yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap + to capture your first thought
              </Text>
            </View>
          ) : null
        }
      />

      {selectionMode && selectedIds.size > 0 ? (
        <View
          style={[
            styles.selectionBar,
            {
              bottom: selectionBarBottom,
              left: gutter,
              right: gutter,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={[
              styles.selectionBtn,
              { backgroundColor: colors.primary, opacity: batchLoading ? 0.7 : 1 },
            ]}
            onPress={() => void handleMarkSelectedDone()}
            disabled={batchLoading}
          >
            {batchLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <AppIcon name="checkmark.circle.fill" size={18} color={colors.primaryForeground} />
                <Text style={[styles.selectionBtnText, { color: colors.primaryForeground }]}>
                  Mark done ({selectedIds.size})
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {!selectionMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New note"
          style={[
            styles.fab,
            {
              bottom: fabBottom,
              right: gutter,
              backgroundColor: colors.card,
              shadowColor: colors.primary,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/note/new');
          }}
        >
          <AppIcon name="plus" size={26} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 41,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
    flex: 1,
  },
  headerTitleCompact: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },
  headerAction: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
    minWidth: 64,
  },
  list: { paddingTop: 8 },
  sep: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  cardText: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
  },
  swipeAction: {
    width: 88,
    marginVertical: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  swipeLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  selectionBar: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  selectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  selectionBtnText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
