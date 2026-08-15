import React, { useState, useCallback, useEffect } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  useListNotes,
  useGetNotesSummary,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
  type Note,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { dismissNoteNotification } from '@/utils/notifications';
import { Confetti } from '@/components/Confetti';
import { TapScale } from '@/components/TapScale';

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
            borderRadius: 10,
          },
        ]}
      >
        {note.isDone && <Feather name="check" size={14} color={colors.primaryForeground} />}
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
              <View style={[styles.badge, { backgroundColor: colors.muted, borderRadius: 4 }]}>
                <Feather name="users" size={10} color={colors.mutedForeground} />
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
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
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const handleToggle = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const wasDone = notes.find((n) => n.id === id)?.isDone;
      await toggleDone.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
      // Clear the persistent lock-screen notification if one exists for this note.
      void dismissNoteNotification(id);
      if (wasDone === false) setConfettiTrigger((c) => c + 1);
    },
    [toggleDone, queryClient, notes],
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

  // Gentle continuous shadow pulse on the FAB (mockup's `fabpulse`).
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.22 + pulse.value * 0.16,
    shadowRadius: 8 + pulse.value * 8,
  }));

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

      <Confetti trigger={confettiTrigger} />

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
            {/* Stats strip — three separately tinted cards */}
            {summary && (
              <View style={styles.statsStrip}>
                {[
                  {
                    label: 'Open',
                    value: summary.open,
                    bg: colors.card,
                    border: colors.border,
                    text: colors.foreground,
                    labelColor: colors.mutedForeground,
                  },
                  {
                    label: 'Urgent',
                    value: summary.urgent,
                    bg: colors.accent + '1a',
                    border: colors.accent + '55',
                    text: colors.accent,
                    labelColor: colors.accent + 'cc',
                  },
                  {
                    label: 'Done',
                    value: summary.completed,
                    bg: colors.primary + '18',
                    border: colors.primary + '4d',
                    text: colors.primary,
                    labelColor: colors.primary + 'cc',
                  },
                ].map((s) => (
                  <View
                    key={s.label}
                    style={[
                      styles.statCell,
                      { backgroundColor: s.bg, borderColor: s.border, borderRadius: colors.radius - 4 },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: s.text }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: s.labelColor }]}>{s.label}</Text>
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
                <SymbolView name="note.text" tintColor={colors.mutedForeground} size={40} />
              ) : (
                <Feather name="file-text" size={40} color={colors.mutedForeground} />
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
      <TapScale
        style={[
          styles.fab,
          pulseStyle,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 70,
            borderRadius: 22,
          },
        ]}
        onPress={() => router.push('/note/new')}
      >
        <Feather name="plus" size={28} color={colors.primaryForeground} />
      </TapScale>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 34, fontFamily: 'Manrope_800ExtraBold' },

  list: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },

  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, borderWidth: 1 },
  statValue: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },

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
    width: 26,
    height: 26,
    borderWidth: 2,
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
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
});
