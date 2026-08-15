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
  useListGroups,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function NoteDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: note, isLoading } = useGetNote(id ?? '');
  const { data: groups = [] } = useListGroups();

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const toggleDone = useToggleNoteDone();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync local state when note loads (run only once per note id)
  useEffect(() => {
    if (!note) return;
    setTitle(note.title ?? '');
    setBody(note.body);
    setIsUrgent(note.isUrgent);
    setGroupId(note.groupId ?? null);
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
          groupId: groupId || null,
        },
      });
      invalidate();
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not save note. Please try again.');
    }
  }, [note, body, title, isUrgent, groupId, updateNote, invalidate]);

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
                style={{
                  fontSize: 16,
                  fontFamily: 'Manrope_600SemiBold',
                  color: colors.primary,
                }}
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

  const currentGroup = groups.find((g) => g.id === groupId);

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
          onChangeText={(t) => {
            setTitle(t);
            setDirty(true);
          }}
          returnKeyType="next"
        />

        {/* Body */}
        <TextInput
          style={[styles.bodyInput, { color: colors.foreground }]}
          placeholder="Write your note…"
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={(t) => {
            setBody(t);
            setDirty(true);
          }}
          multiline
          textAlignVertical="top"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Metadata */}
        <View style={styles.meta}>
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
              onValueChange={(v) => {
                setIsUrgent(v);
                setDirty(true);
              }}
              trackColor={{ false: colors.muted, true: colors.accent + 'aa' }}
              thumbColor={isUrgent ? colors.accent : colors.mutedForeground}
            />
          </View>

          {/* Group picker */}
          <Pressable
            style={styles.metaRow}
            onPress={() => setShowGroupPicker((p) => !p)}
          >
            <Feather
              name="users"
              size={18}
              color={groupId ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.metaLabel, { color: colors.foreground }]}>
              {currentGroup ? currentGroup.name : 'Personal'}
            </Text>
            <Feather
              name={showGroupPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>

          {showGroupPicker && (
            <View
              style={[
                styles.picker,
                {
                  backgroundColor: colors.muted,
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.pickerRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: groups.length > 0 ? 1 : 0,
                  },
                ]}
                onPress={() => {
                  setGroupId(null);
                  setDirty(true);
                  setShowGroupPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerText,
                    {
                      color: !groupId ? colors.primary : colors.foreground,
                      fontFamily: !groupId
                        ? 'Manrope_600SemiBold'
                        : 'Manrope_400Regular',
                    },
                  ]}
                >
                  Personal (no group)
                </Text>
                {!groupId && (
                  <Feather name="check" size={16} color={colors.primary} />
                )}
              </Pressable>
              {groups.map((g, i) => (
                <Pressable
                  key={g.id}
                  style={[
                    styles.pickerRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: i < groups.length - 1 ? 1 : 0,
                    },
                  ]}
                  onPress={() => {
                    setGroupId(g.id);
                    setDirty(true);
                    setShowGroupPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      {
                        color:
                          groupId === g.id ? colors.primary : colors.foreground,
                        fontFamily:
                          groupId === g.id
                            ? 'Manrope_600SemiBold'
                            : 'Manrope_400Regular',
                      },
                    ]}
                  >
                    {g.name}
                  </Text>
                  {groupId === g.id && (
                    <Feather name="check" size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Reminder info (read-only) */}
          {note.remindAt && (
            <View style={styles.metaRow}>
              <Feather name="clock" size={18} color={colors.mutedForeground} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
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
                    {
                      color: colors.primary,
                      backgroundColor: colors.primary + '1a',
                      borderRadius: 4,
                    },
                  ]}
                >
                  Sent
                </Text>
              )}
            </View>
          )}

          {/* Completed by */}
          {note.isDone && note.completedByEmail && (
            <View style={styles.metaRow}>
              <Feather name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                Done by {note.completedByEmail.split('@')[0]}
                {note.completedAt
                  ? ` · ${new Date(note.completedAt).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Toggle done */}
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
                    {
                      color: note.isDone
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                    },
                  ]}
                >
                  {note.isDone ? 'Reopen' : 'Mark done'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Delete */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },

  titleInput: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  bodyInput: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 26,
    minHeight: 180,
    marginBottom: 24,
  },
  divider: { height: 1, marginBottom: 16 },

  meta: { gap: 0 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  metaLabel: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium' },
  sentBadge: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  picker: { marginVertical: 4, overflow: 'hidden' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pickerText: { fontSize: 15 },

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
