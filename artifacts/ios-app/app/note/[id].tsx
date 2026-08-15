import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import {
  useGetNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ShareModal } from '@/components/ShareModal';
import { dismissNoteNotification } from '@/utils/notifications';

export default function NoteDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: note, isLoading } = useGetNote(id ?? '');

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const toggleDone = useToggleNoteDone();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!note) return;
    setTitle(note.title ?? '');
    setBody(note.body);
    setIsUrgent(note.isUrgent);
    setIsPinned(note.isPinned);
    setGroupId(note.groupId ?? null);
    setGroupName(note.groupName ?? null);
    setDirty(false);
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
  }, [queryClient]);

  const handleSave = useCallback(async () => {
    if (!note || !body.trim()) return;
    try {
      await updateNote.mutateAsync({
        id: note.id,
        data: {
          title: title.trim() || null,
          body: body.trim(),
          isUrgent,
          isPinned,
          groupId: groupId || null,
        },
      });
      invalidate();
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not save note. Please try again.');
    }
  }, [note, body, title, isUrgent, isPinned, groupId, updateNote, invalidate]);

  const handleDelete = useCallback(() => {
    if (!note) return;
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await deleteNote.mutateAsync({ id: note.id });
          invalidate();
          router.back();
        },
      },
    ]);
  }, [note, deleteNote, invalidate]);

  const handleToggle = useCallback(async () => {
    if (!note) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleDone.mutateAsync({ id: note.id });
    invalidate();
    // Clear the persistent lock-screen notification (best-effort).
    void dismissNoteNotification(note.id);
  }, [note, toggleDone, invalidate]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () =>
        dirty ? (
          <Pressable onPress={handleSave} hitSlop={12} disabled={updateNote.isPending}>
            {updateNote.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={{ fontSize: 16, fontFamily: 'Manrope_600SemiBold', color: colors.primary }}
              >
                Save
              </Text>
            )}
          </Pressable>
        ) : null,
    });
  }, [dirty, updateNote.isPending, handleSave, colors.primary, navigation]);

  if (isLoading || !note) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: colors.foreground }]}
          placeholder="Title (optional)"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={(t) => { setTitle(t); setDirty(true); }}
          returnKeyType="next"
        />

        {/* Body */}
        <TextInput
          style={[styles.bodyInput, { color: colors.foreground }]}
          placeholder="Write your note…"
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={(t) => { setBody(t); setDirty(true); }}
          multiline
          textAlignVertical="top"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Flags ────────────────────────────────────────────────── */}

        {/* Urgent */}
        <View style={styles.metaRow}>
          <Feather
            name="alert-circle"
            size={18}
            color={isUrgent ? colors.accent : colors.mutedForeground}
          />
          <Text style={[styles.metaLabel, { color: colors.foreground }]}>Urgent</Text>
          <Switch
            value={isUrgent}
            onValueChange={(v) => { setIsUrgent(v); setDirty(true); }}
            trackColor={{ false: colors.muted, true: colors.accent + 'aa' }}
            thumbColor={isUrgent ? colors.accent : colors.mutedForeground}
          />
        </View>

        {/* Add to Home Screen */}
        <View style={styles.metaRow}>
          <Feather
            name="bookmark"
            size={18}
            color={isPinned ? colors.primary : colors.mutedForeground}
          />
          <View style={styles.metaLabelCol}>
            <Text style={[styles.metaLabel, { color: colors.foreground }]}>Add to Home Screen</Text>
            <Text style={[styles.metaDesc, { color: colors.mutedForeground }]}>
              {note.remindAt && !note.isPinned
                ? 'Notification sends at the scheduled reminder time'
                : 'Keeps this note on your lock screen until completed'}
            </Text>
          </View>
          <Switch
            value={isPinned}
            onValueChange={(v) => { setIsPinned(v); setDirty(true); }}
            trackColor={{ false: colors.muted, true: colors.primary + 'bb' }}
            thumbColor={isPinned ? colors.primary : colors.mutedForeground}
          />
        </View>

        {/* Reminder info (read-only) */}
        {note.remindAt && (
          <View style={styles.metaRow}>
            <Feather name="clock" size={18} color={colors.mutedForeground} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground, flex: 1 }]}>
              Reminder:{' '}
              {new Date(note.remindAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {note.reminderSentAt && (
              <Text
                style={[
                  styles.sentBadge,
                  { color: colors.primary, backgroundColor: colors.primary + '1a', borderRadius: 4 },
                ]}
              >
                Sent
              </Text>
            )}
          </View>
        )}

        {/* Done by */}
        {note.isDone && note.completedByEmail && (
          <View style={styles.metaRow}>
            <Feather name="check-circle" size={18} color={colors.primary} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground, flex: 1 }]}>
              Done by {note.completedByEmail.split('@')[0]}
              {note.completedAt
                ? ` · ${new Date(note.completedAt).toLocaleDateString()}`
                : ''}
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Share ────────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SHARE</Text>
        </View>

        {groupId ? (
          <Pressable
            style={({ pressed }) => [
              styles.groupBadge,
              {
                backgroundColor: colors.primary + '15',
                borderColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => setShowShareModal(true)}
          >
            <Feather name="users" size={16} color={colors.primary} />
            <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
              {groupName ?? 'Shared group'}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => {
                setGroupId(null);
                setGroupName(null);
                setDirty(true);
              }}
            >
              <Feather name="x" size={14} color={colors.primary} />
            </Pressable>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.shareBtn,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setShowShareModal(true)}
          >
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
            <View style={styles.shareBtnLabel}>
              <Text style={[styles.shareBtnTitle, { color: colors.foreground }]}>
                Share with a group
              </Text>
              <Text style={[styles.shareBtnDesc, { color: colors.mutedForeground }]}>
                Collaborate with people you've added
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* ── Actions ──────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: note.isDone ? colors.muted : colors.primary,
                borderRadius: colors.radius / 2,
                opacity: pressed ? 0.8 : 1,
                flex: 1,
              },
            ]}
            onPress={handleToggle}
            disabled={toggleDone.isPending}
          >
            {toggleDone.isPending ? (
              <ActivityIndicator
                size="small"
                color={note.isDone ? colors.mutedForeground : colors.primaryForeground}
              />
            ) : (
              <>
                {Platform.OS === 'ios' ? (
                  <SymbolView
                    name={note.isDone ? 'arrow.uturn.backward' : 'checkmark.circle'}
                    tintColor={note.isDone ? colors.mutedForeground : colors.primaryForeground}
                    size={18}
                  />
                ) : (
                  <Feather
                    name={note.isDone ? 'rotate-ccw' : 'check-circle'}
                    size={18}
                    color={note.isDone ? colors.mutedForeground : colors.primaryForeground}
                  />
                )}
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: note.isDone ? colors.mutedForeground : colors.primaryForeground },
                  ]}
                >
                  {note.isDone ? 'Reopen' : 'Mark done'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                borderColor: colors.destructive,
                borderRadius: colors.radius / 2,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleDelete}
            disabled={deleteNote.isPending}
          >
            {deleteNote.isPending ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : Platform.OS === 'ios' ? (
              <SymbolView name="trash" tintColor={colors.destructive} size={18} />
            ) : (
              <Feather name="trash-2" size={18} color={colors.destructive} />
            )}
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      <ShareModal
        visible={showShareModal}
        selectedGroupId={groupId}
        onClose={() => setShowShareModal(false)}
        onSelect={(gid, gname) => {
          setGroupId(gid);
          setGroupName(gname ?? null);
          setDirty(true);
          setShowShareModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },

  titleInput: { fontSize: 24, fontFamily: 'Manrope_700Bold', marginBottom: 12 },
  bodyInput: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 26,
    minHeight: 160,
    marginBottom: 24,
  },
  divider: { height: 1, marginVertical: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  metaLabel: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  metaLabelCol: { flex: 1 },
  metaDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  sentBadge: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  sectionHead: { paddingTop: 16, paddingBottom: 6 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
  },
  shareBtnLabel: { flex: 1 },
  shareBtnTitle: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  shareBtnDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  groupBadgeText: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  deleteBtn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
