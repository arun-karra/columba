import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import {
  useListNotes,
  useGetNotesSummary,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { Note } from '@workspace/api-client-react';

type Filter = 'all' | 'open' | 'urgent' | 'done';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'done', label: 'Done' },
];

// ─── Note Card ───────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onToggle: () => void;
  onPress: () => void;
}

function NoteCard({ note, onToggle, onPress }: NoteCardProps) {
  const colors = useColors();
  const done = note.isDone;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: done ? colors.border : note.isUrgent ? colors.accent + '55' : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.82 : done ? 0.55 : 1,
        },
      ]}
      onPress={onPress}
    >
      {/* Checkbox */}
      <Pressable
        hitSlop={14}
        style={[
          styles.checkbox,
          {
            borderColor: done ? colors.primary : colors.border,
            backgroundColor: done ? colors.primary : 'transparent',
            borderRadius: 12,
          },
        ]}
        onPress={onToggle}
      >
        {done &&
          (Platform.OS === 'ios' ? (
            <SymbolView name="checkmark" tintColor={colors.primaryForeground} size={11} />
          ) : (
            <Feather name="check" size={11} color={colors.primaryForeground} />
          ))}
      </Pressable>

      {/* Content */}
      <View style={styles.cardBody}>
        {!!note.title && (
          <Text
            style={[
              styles.cardTitle,
              {
                color: colors.foreground,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        )}
        <Text
          style={[
            styles.cardText,
            {
              color: done ? colors.mutedForeground : colors.foreground,
              fontFamily: note.title ? 'Manrope_400Regular' : 'Manrope_500Medium',
            },
          ]}
          numberOfLines={2}
        >
          {note.body}
        </Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {note.groupName ? (
            <View
              style={[styles.badge, { backgroundColor: colors.secondary, borderRadius: 5 }]}
            >
              <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                {note.groupName}
              </Text>
            </View>
          ) : null}
          {note.isUrgent && !done ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.accent + '28', borderRadius: 5 },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
                Urgent
              </Text>
            </View>
          ) : null}
          {note.remindAt && !note.reminderSentAt ? (
            <View style={[styles.badge, { backgroundColor: colors.muted, borderRadius: 5 }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                {new Date(note.remindAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
          {done && note.completedByEmail ? (
            <Text
              style={[styles.completedBy, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              by {note.completedByEmail.split('@')[0]}
            </Text>
          ) : null}
        </View>
      </View>

      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

// ─── Summary Strip ───────────────────────────────────────────────────────────

function SummaryStrip({
  total,
  open,
  urgent,
  completed,
}: {
  total: number;
  open: number;
  urgent: number;
  completed: number;
}) {
  const colors = useColors();
  return (
    <View style={[styles.summaryRow, { borderColor: colors.border }]}>
      <Stat label="Total" value={total} color={colors.foreground} />
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <Stat label="Open" value={open} color={colors.primary} />
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <Stat label="Urgent" value={urgent} color={colors.accent} />
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <Stat label="Done" value={completed} color={colors.mutedForeground} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: notes = [], isLoading } = useListNotes({
    query: { enabled: !!user },
  });
  const { data: summary } = useGetNotesSummary({
    query: { enabled: !!user },
  });

  const toggleDone = useToggleNoteDone({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
      },
    },
  });

  const filtered = notes.filter((n) => {
    if (filter === 'open') return !n.isDone;
    if (filter === 'urgent') return n.isUrgent && !n.isDone;
    if (filter === 'done') return n.isDone;
    return true;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const handleToggle = (note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleDone.mutate({ id: note.id });
  };

  const fabBottom =
    insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 72;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
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

        {summary && (
          <SummaryStrip
            total={summary.total}
            open={summary.open}
            urgent={summary.urgent}
            completed={summary.completed}
          />
        )}

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === key ? colors.primary : colors.muted,
                  borderRadius: 20,
                },
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      filter === key ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Loading notes…
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {filter === 'all' ? 'No notes yet' : `No ${filter} notes`}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {filter === 'all' ? 'Tap + to add your first note' : 'Nothing here right now'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: fabBottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onToggle={() => handleToggle(item)}
              onPress={() => router.push(`/note/${item.id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderRadius: 28,
            bottom: fabBottom,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/note/new');
        }}
      >
        <Feather name="plus" size={26} color={colors.accentForeground} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1 },
  headerTitle: { fontSize: 32, fontFamily: 'Manrope_700Bold', marginBottom: 14 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  statValue: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Manrope_500Medium', opacity: 0.7 },
  statDivider: { width: 1, marginVertical: 10 },

  // Filter chips
  filterRow: { paddingVertical: 12, gap: 8, paddingRight: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 7 },
  chipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  cardText: { fontSize: 14, lineHeight: 20 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  badge: { paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  completedBy: { fontSize: 11, fontFamily: 'Manrope_400Regular' },

  // Empty
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope_600SemiBold', marginTop: 6 },
  emptyText: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
