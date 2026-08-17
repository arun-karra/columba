import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { confirmDestructive } from '@/utils/iosConfirm';
import { FAB_SIZE, useFabBottom, useListBottomPadding, useScreenGutter } from '@/constants/layout';
import { getGroupEmojiMap, resolveGroupEmoji } from '@/utils/groupEmoji';
import { clearPinnedNoteNotification } from '@/utils/pinnedNoteNotification';
import { dismissNoteNotification } from '@/utils/notifications';

function NoteCardContent({
  note,
  groupEmoji,
}: {
  note: Note;
  groupEmoji: string | null;
}) {
  const colors = useColors();
  const isDone = note.isDone;
  const isUrgent = note.isUrgent;

  return (
    <>
      <View style={styles.cardInner}>
        {groupEmoji ? (
          <Text style={styles.groupEmoji}>{groupEmoji}</Text>
        ) : isUrgent && !isDone ? (
          <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
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
      <AppIcon name="chevron.right" size={16} color={colors.mutedForeground} />
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
  const openSwipeRef = useRef<Swipeable | null>(null);

  const { data: notes = [], isLoading, refetch } = useListNotes({
    query: { queryKey: getListNotesQueryKey(), enabled: !!user },
  });

  const toggleDone = useToggleNoteDone();
  const deleteNote = useDeleteNote();

  useEffect(() => {
    void getGroupEmojiMap().then(setEmojiMap);
  }, [notes.length]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
  }, [queryClient]);

  const onRefresh = useCallback(async () => {
    await invalidate();
    await getGroupEmojiMap().then(setEmojiMap);
  }, [invalidate]);

  const handlePress = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push(`/note/${id}`);
  }, []);

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
    (note: Note) => {
      openSwipeRef.current?.close();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void (async () => {
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
      })();
    },
    [toggleDone, invalidate],
  );

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => {
          const groupEmoji =
            item.groupId && item.groupName
              ? resolveGroupEmoji(item.groupId, item.groupName, emojiMap)
              : null;

          const renderLeftActions = () => (
            <Pressable
              style={[
                styles.swipeAction,
                {
                  backgroundColor: item.isDone ? colors.secondary : colors.primary,
                },
              ]}
              onPress={() => handleToggleDone(item)}
            >
              <AppIcon
                name={item.isDone ? 'arrow.counterclockwise' : 'checkmark'}
                size={20}
                color={item.isDone ? colors.foreground : colors.primaryForeground}
              />
              <Text
                style={[
                  styles.swipeLabel,
                  { color: item.isDone ? colors.foreground : colors.primaryForeground },
                ]}
              >
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
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.82 : item.isDone ? 0.55 : 1,
                  },
                ]}
                onPress={() => handlePress(item.id)}
              >
                <NoteCardContent note={item} groupEmoji={groupEmoji} />
              </Pressable>
            </Swipeable>
          );
        }}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: gutter, paddingBottom: listBottom },
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
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  groupEmoji: { fontSize: 20, lineHeight: 24 },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
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
});
