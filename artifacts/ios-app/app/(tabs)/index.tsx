import React, { useState, useCallback } from 'react';
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
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListNotes,
  useGetNotesSummary,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
  type Note,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

// ─── Filter Chip ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'open' | 'urgent' | 'pinned' | 'done';

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.muted,
          borderRadius: 20,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.primaryForeground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onToggle,
  onPress,
}: {
  note: Note;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
}) {
  const colors = useColors();
  const hasPinBadge = note.isPinned;
  const hasGroupBadge = !!note.groupName;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: note.isUrgent ? colors.accent + '66' : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
          borderLeftWidth: note.isUrgent ? 3 : 1,
          borderLeftColor: note.isUrgent ? colors.accent : colors.border,
        },
      ]}
      onPress={() => onPress(note.id)}
    >
      {/* Checkbox */}
      <Pressable
        onPress={() => onToggle(note.id)}
        hitSlop={12}
        style={[
          styles.checkbox,
          {
            borderColor: note.isDone ? colors.primary : colors.mutedForeground,
            backgroundColor: note.isDone ? colors.primary : 'transparent',
            borderRadius: 12,
          },
        ]}
      >
        {note.isDone && <Feather name="check" size={12} color={colors.primaryForeground} />}
      </Pressable>

      {/* Content */}
      <View style={styles.cardBody}>
        {note.title && (
          <Text
            style={[
              styles.cardTitle,
              {
                color: note.isDone ? colors.mutedForeground : colors.foreground,
                textDecorationLine: note.isDone ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        )}
        <Text
          style={[
            styles.cardBody2,
            {
              color: note.isDone ? colors.mutedForeground : colors.foreground,
              opacity: note.isDone ? 0.6 : 0.85,
            },
          ]}
          numberOfLines={2}
        >
          {note.body}
        </Text>

        {/* Badges row */}
        {(hasPinBadge || hasGroupBadge || note.remindAt) && (
          <View style={styles.badges}>
            {hasPinBadge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary + '18', borderRadius: 4 },
                ]}
              >
                <Feather name="bookmark" size={10} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>Pinned</Text>
              </View>
            )}
            {hasGroupBadge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.secondary + '44', borderRadius: 4 },
                ]}
              >
                <Feather name="users" size={10} color={colors.secondaryForeground} />
                <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                  {note.groupName}
                </Text>
              </View>
            )}
            {note.remindAt && !note.reminderSentAt && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.muted, borderRadius: 4 },
                ]}
              >
                <Feather name="clock" size={10} color={colors.mutedForeground} />
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                  {new Date(note.remindAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Urgent indicator */}
      {note.isUrgent && !note.isDone && (
        <Feather name="alert-circle" size={16} color={colors.accent} />
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const {
    data: notes = [],
    isLoading,
    refetch,
    isRefetching,
  } = useListNotes();

  const { data: summary } = useGetNotesSummary();
  const toggleDone = useToggleNoteDone();

  const handleToggle = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleDone.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
    },
    [toggleDone, queryClient],
  );

  const handlePress = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, []);

  // Split into pinned + filtered rest
  const pinnedNotes = notes.filter((n) => n.isPinned && !n.isDone);

  const filteredNotes = notes.filter((n) => {
    if (n.isPinned && filter === 'all') return false; // pinned shown separately
    if (filter === 'all') return true;
    if (filter === 'open') return !n.isDone;
    if (filter === 'urgent') return n.isUrgent && !n.isDone;
    if (filter === 'pinned') return n.isPinned;
    if (filter === 'done') return n.isDone;
    return true;
  });

  const showPinnedSection = pinnedNotes.length > 0 && filter === 'all';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 80,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Stats strip */}
            {summary && (
              <View
                style={[
                  styles.statsStrip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {[
                  { label: 'Open', value: summary.open },
                  { label: 'Done', value: summary.completed },
                  { label: 'Urgent', value: summary.urgent },
                ].map((s, i) => (
                  <View
                    key={s.label}
                    style={[
                      styles.statCell,
                      i < 2 && {
                        borderRightWidth: 1,
                        borderRightColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {s.value}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Filter chips */}
            <View style={styles.chips}>
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'open', label: 'Open' },
                  { key: 'urgent', label: 'Urgent' },
                  { key: 'pinned', label: 'Pinned' },
                  { key: 'done', label: 'Done' },
                ] as { key: Filter; label: string }[]
              ).map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  active={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </View>

            {/* ── Pinned section ───────────────────────────────── */}
            {showPinnedSection && (
              <View style={styles.pinnedSection}>
                <View style={styles.sectionHeadRow}>
                  <Feather name="bookmark" size={13} color={colors.primary} />
                  <Text style={[styles.sectionHeadText, { color: colors.primary }]}>
                    Pinned
                  </Text>
                </View>
                {pinnedNotes.map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onToggle={handleToggle}
                    onPress={handlePress}
                  />
                ))}
                {filteredNotes.length > 0 && (
                  <View style={styles.sectionHeadRow}>
                    <Text
                      style={[
                        styles.sectionHeadText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Other notes
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onToggle={handleToggle}
            onPress={handlePress}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              {Platform.OS === 'ios' ? (
                <SymbolView name="note.text" tintColor={colors.muted} size={40} />
              ) : (
                <Feather name="file-text" size={40} color={colors.muted} />
              )}
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filter === 'all'
                  ? 'No notes yet. Tap + to add one.'
                  : `No ${filter} notes.`}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 70,
            opacity: pressed ? 0.85 : 1,
            borderRadius: 28,
          },
        ]}
        onPress={() => router.push('/note/new')}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 32, fontFamily: 'Manrope_700Bold' },

  list: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },

  statsStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 22, fontFamily: 'Manrope_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },

  pinnedSection: { marginBottom: 6 },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeadText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', marginBottom: 3 },
  cardBody2: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: 'Manrope_500Medium' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Manrope_400Regular', textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
});
