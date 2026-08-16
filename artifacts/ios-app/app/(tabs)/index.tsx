import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListNotes,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
  type Note,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onPress,
}: {
  note: Note;
  onPress: (id: string) => void;
}) {
  const colors = useColors();
  const isDone = note.isDone;
  const isUrgent = note.isUrgent;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: pressed ? 0.82 : isDone ? 0.55 : 1,
        },
      ]}
      onPress={() => onPress(note.id)}
    >
      <View style={styles.cardInner}>
        {isUrgent && !isDone ? (
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
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: notes = [], isLoading, refetch } = useListNotes({
    query: { queryKey: getListNotesQueryKey(), enabled: !!user },
  });

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    await queryClient.invalidateQueries({
      queryKey: getGetNotesSummaryQueryKey(),
    });
  }, [queryClient]);

  const handlePress = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push(`/note/${id}`);
  }, []);

  const handleNewNote = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/note/new');
  }, []);

  const fabBottom =
    insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 72;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          style={styles.avatarBtn}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <View
            style={[styles.headerAvatar, { backgroundColor: colors.secondary }]}
          >
            <Feather name="user" size={14} color={colors.primary} />
          </View>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Columba
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* List */}
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NoteCard note={item} onPress={handlePress} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: fabBottom + 24 },
        ]}
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
              <Feather name="file-text" size={40} color={colors.secondary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No notes yet
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Tap + to capture your first thought
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        style={[
          styles.fab,
          {
            bottom: fabBottom - 56,
            backgroundColor: colors.card,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handleNewNote}
      >
        <Feather name="plus" size={26} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  avatarBtn: {},
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
  },
  headerRight: { width: 32 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
  sep: { height: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
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
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 22,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
