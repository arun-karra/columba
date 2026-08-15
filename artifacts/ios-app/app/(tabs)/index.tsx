import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { dismissNoteNotification } from '@/utils/notifications';

// ─── Filter Chip ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'open' | 'urgent' | 'pinned' | 'done';

const FILTER_EMOJIS: Record<Filter, string> = {
  all: '✦',
  open: '○',
  urgent: '🔥',
  pinned: '📌',
  done: '✓',
};

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
          backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.65)',
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: active ? colors.primary : 'rgba(30,92,84,0.15)',
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? '#FFFFFF' : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function noteStrip(note: Note, colors: ReturnType<typeof useColors>) {
  if (note.isDone) return colors.done;
  if (note.isUrgent) return colors.urgent;
  if (note.isPinned) return colors.accent;
  return colors.primary + '50';
}

function noteBg(note: Note) {
  if (note.isDone) return 'rgba(52,200,138,0.05)';
  if (note.isUrgent) return 'rgba(255,107,91,0.06)';
  if (note.isPinned) return 'rgba(245,166,35,0.06)';
  return '#FFFFFF';
}

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
  const stripColor = noteStrip(note, colors);
  const bg = noteBg(note);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.88 : 1,
          borderRadius: 22,
        },
      ]}
      onPress={() => onPress(note.id)}
    >
      {/* Coloured left strip */}
      <View style={[styles.strip, { backgroundColor: stripColor }]} />

      {/* Checkbox */}
      <Pressable
        onPress={() => onToggle(note.id)}
        hitSlop={14}
        style={[
          styles.checkbox,
          {
            borderColor: note.isDone ? colors.done : colors.primary + '60',
            backgroundColor: note.isDone ? colors.done : 'transparent',
          },
        ]}
      >
        {note.isDone && <Feather name="check" size={14} color="#FFFFFF" />}
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
            styles.cardBodyText,
            {
              color: note.isDone ? colors.mutedForeground : colors.foreground,
              opacity: note.isDone ? 0.55 : 0.85,
            },
          ]}
          numberOfLines={2}
        >
          {note.body}
        </Text>

        {/* Badges */}
        {(note.isPinned || note.groupName || (note.remindAt && !note.reminderSentAt)) && (
          <View style={styles.badges}>
            {note.isPinned && (
              <View style={[styles.badge, { backgroundColor: colors.accent + '22' }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>📌 Pinned</Text>
              </View>
            )}
            {note.groupName && (
              <View style={[styles.badge, { backgroundColor: colors.sky + '22' }]}>
                <Feather name="users" size={10} color={colors.sky} />
                <Text style={[styles.badgeText, { color: colors.sky }]}>{note.groupName}</Text>
              </View>
            )}
            {note.remindAt && !note.reminderSentAt && (
              <View style={[styles.badge, { backgroundColor: colors.lavender + '22' }]}>
                <Feather name="clock" size={10} color={colors.lavender} />
                <Text style={[styles.badgeText, { color: colors.lavender }]}>
                  {new Date(note.remindAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Urgent indicator */}
      {note.isUrgent && !note.isDone && (
        <Text style={styles.urgentEmoji}>🔥</Text>
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
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
      void dismissNoteNotification(id);
    },
    [toggleDone, queryClient],
  );

  const handlePress = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, []);

  const pinnedNotes = notes.filter((n) => n.isPinned && !n.isDone);
  const filteredNotes = notes.filter((n) => {
    if (n.isPinned && filter === 'all') return false;
    if (filter === 'all') return true;
    if (filter === 'open') return !n.isDone;
    if (filter === 'urgent') return n.isUrgent && !n.isDone;
    if (filter === 'pinned') return n.isPinned;
    if (filter === 'done') return n.isDone;
    return true;
  });
  const showPinnedSection = pinnedNotes.length > 0 && filter === 'all';

  const STATS = summary
    ? [
        { label: 'Open', value: summary.open, color: colors.primary, emoji: '○' },
        { label: 'Done', value: summary.completed, color: colors.done, emoji: '✓' },
        { label: 'Urgent', value: summary.urgent, color: colors.urgent, emoji: '🔥' },
      ]
    : null;

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={scheme === 'dark'
          ? [colors.gradientStart, colors.gradientEnd]
          : ['#D4F0E8', '#EBF7F3', '#F0F9F6']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 90 },
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
            {STATS && (
              <BlurView
                intensity={scheme === 'dark' ? 40 : 60}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                style={styles.statsStrip}
              >
                {STATS.map((s, i) => (
                  <View
                    key={s.label}
                    style={[
                      styles.statCell,
                      i < 2 && {
                        borderRightWidth: 1,
                        borderRightColor: 'rgba(30,92,84,0.1)',
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </BlurView>
            )}

            {/* Filter chips */}
            <View style={styles.chips}>
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'open', label: 'Open' },
                  { key: 'urgent', label: '🔥 Urgent' },
                  { key: 'pinned', label: '📌 Pinned' },
                  { key: 'done', label: '✓ Done' },
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

            {/* Pinned section */}
            {showPinnedSection && (
              <View style={styles.pinnedSection}>
                <View style={styles.sectionHeadRow}>
                  <Text style={[styles.sectionHeadText, { color: colors.accent }]}>
                    📌  Lock screen notes
                  </Text>
                </View>
                {pinnedNotes.map((n) => (
                  <NoteCard key={n.id} note={n} onToggle={handleToggle} onPress={handlePress} />
                ))}
                {filteredNotes.length > 0 && (
                  <Text style={[styles.sectionHeadText, { color: colors.mutedForeground, marginBottom: 8, marginTop: 16 }]}>
                    Everything else
                  </Text>
                )}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <NoteCard note={item} onToggle={handleToggle} onPress={handlePress} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {filter === 'urgent' ? '😌' : filter === 'done' ? '🎉' : '📝'}
              </Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {filter === 'all' ? 'Nothing here yet!' : `No ${filter} notes`}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filter === 'all'
                  ? 'Tap the big button below to add your first note ↓'
                  : 'Try a different filter or add a new note.'}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* FAB */}
      <View
        style={[
          styles.fabWrap,
          { bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 70 },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/note/new');
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <LinearGradient
            colors={['#F5A623', '#FF6B5B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Feather name="plus" size={30} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 14 },
  headerTitle: { fontSize: 36, fontFamily: 'Manrope_700Bold', letterSpacing: -0.5 },

  list: { paddingHorizontal: 16, paddingTop: 8, gap: 0 },

  statsStrip: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.12)',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 26, fontFamily: 'Manrope_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },

  pinnedSection: { marginBottom: 4 },
  sectionHeadRow: { marginBottom: 10 },
  sectionHeadText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  strip: { width: 6, alignSelf: 'stretch', flexShrink: 0 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginLeft: 14,
    flexShrink: 0,
  },
  cardBody: { flex: 1, paddingVertical: 14, paddingRight: 14, paddingLeft: 12 },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', marginBottom: 3 },
  cardBodyText: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },

  urgentEmoji: { fontSize: 18, paddingTop: 14, paddingRight: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontFamily: 'Manrope_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 21, paddingHorizontal: 24 },

  fabWrap: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
});
