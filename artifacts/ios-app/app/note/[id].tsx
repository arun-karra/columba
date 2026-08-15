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
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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

// ─── Quick reminder presets (same as new.tsx) ─────────────────────────────────

const quickReminders = () => {
  const now = new Date();

  const inOneHour = new Date(now);
  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);

  const tonight = new Date(now);
  tonight.setHours(19, 0, 0, 0);
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);

  return [
    { emoji: '⚡', label: '1 hour', color: '#F5A623', date: inOneHour },
    { emoji: '🌙', label: 'Tonight', color: '#9B8FE8', date: tonight },
    { emoji: '☀️', label: 'Tomorrow', color: '#5BB8F5', date: tomorrow },
    { emoji: '📅', label: 'Next week', color: '#34C88A', date: nextWeek },
  ];
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NoteDetailScreen() {
  const colors = useColors();
  const scheme = useColorScheme();
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
  const [remindAt, setRemindAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    setRemindAt(note.remindAt ? new Date(note.remindAt) : null);
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
          remindAt: remindAt ? remindAt.toISOString() : null,
        },
      });
      invalidate();
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Hmm…', 'Could not save. Give it another go!');
    }
  }, [note, body, title, isUrgent, isPinned, groupId, remindAt, updateNote, invalidate]);

  const handleDelete = useCallback(() => {
    if (!note) return;
    Alert.alert('Delete note?', 'Gone forever — no take backs! 👋', [
      { text: 'Keep it', style: 'cancel' },
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
              <Text style={{ fontSize: 16, fontFamily: 'Manrope_700Bold', color: colors.accent }}>
                Save
              </Text>
            )}
          </Pressable>
        ) : null,
    });
  }, [dirty, updateNote.isPending, handleSave, colors.primary, colors.accent, navigation]);

  if (isLoading || !note) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const presets = quickReminders();
  const reminderLabel = remindAt
    ? remindAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={scheme === 'dark'
          ? [colors.gradientStart, colors.gradientEnd]
          : ['#D4F0E8', '#EBF7F3', '#F0F9F6']}
        style={StyleSheet.absoluteFill}
      />

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
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={(t) => { setBody(t); setDirty(true); }}
          multiline
          textAlignVertical="top"
        />

        <View style={[styles.divider, { backgroundColor: 'rgba(30,92,84,0.1)' }]} />

        {/* ─── Reminder ─────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⏰  Remind me</Text>

          <View style={styles.chipRow}>
            {presets.map((p) => {
              const isActive = remindAt?.getTime() === p.date.getTime();
              return (
                <Pressable
                  key={p.label}
                  style={({ pressed }) => [
                    styles.reminderChip,
                    {
                      backgroundColor: isActive ? p.color : 'rgba(255,255,255,0.65)',
                      borderColor: isActive ? p.color : 'rgba(0,0,0,0.08)',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (isActive) {
                      setRemindAt(null);
                    } else {
                      setRemindAt(p.date);
                      setShowDatePicker(false);
                    }
                    setDirty(true);
                  }}
                >
                  <Text style={styles.chipEmoji}>{p.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: isActive ? '#FFFFFF' : colors.foreground }]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom time */}
          <Pressable
            style={[
              styles.customTimeRow,
              {
                backgroundColor: 'rgba(255,255,255,0.55)',
                borderColor: 'rgba(0,0,0,0.07)',
              },
            ]}
            onPress={() => {
              if (!remindAt) {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                setRemindAt(d);
                setDirty(true);
              }
              setShowDatePicker((v) => !v);
            }}
          >
            <Feather name="clock" size={16} color={remindAt ? colors.sky : colors.mutedForeground} />
            <Text style={[styles.customTimeLabel, { color: remindAt ? colors.foreground : colors.mutedForeground, flex: 1 }]}>
              {reminderLabel ?? 'Pick a custom time…'}
            </Text>
            {note.reminderSentAt && remindAt && (
              <View style={[styles.sentBadge, { backgroundColor: colors.done + '22' }]}>
                <Text style={[styles.sentBadgeText, { color: colors.done }]}>Sent ✓</Text>
              </View>
            )}
            {remindAt && (
              <Pressable
                hitSlop={14}
                onPress={(e) => {
                  e.stopPropagation();
                  setRemindAt(null);
                  setShowDatePicker(false);
                  setDirty(true);
                }}
              >
                <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={remindAt ?? new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_event: DateTimePickerEvent, date?: Date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (date) { setRemindAt(date); setDirty(true); }
              }}
              themeVariant={scheme === 'dark' ? 'dark' : 'light'}
              accentColor={colors.primary}
            />
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(30,92,84,0.1)' }]} />

        {/* ─── Options ──────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Options</Text>

          <View style={[styles.toggleCard, { backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(0,0,0,0.07)' }]}>
            {/* Urgent */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleEmoji}>🔥</Text>
              <View style={styles.toggleLabelCol}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Urgent</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Moves this to the top</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={(v) => { Haptics.selectionAsync(); setIsUrgent(v); setDirty(true); }}
                trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.urgent + 'cc' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 18 }]} />

            {/* Pin */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleEmoji}>📌</Text>
              <View style={styles.toggleLabelCol}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Lock screen</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                  {note.remindAt && !note.isPinned
                    ? 'Notification at reminder time'
                    : 'Always visible on lock screen'}
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={(v) => { Haptics.selectionAsync(); setIsPinned(v); setDirty(true); }}
                trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.accent + 'cc' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Done by (read-only, shown when completed) */}
            {note.isDone && note.completedByEmail && (
              <>
                <View style={[styles.divider, { backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 18 }]} />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleEmoji}>✅</Text>
                  <Text style={[styles.toggleDesc, { color: colors.mutedForeground, flex: 1 }]}>
                    Done by {note.completedByEmail.split('@')[0]}
                    {note.completedAt ? ` · ${new Date(note.completedAt).toLocaleDateString()}` : ''}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(30,92,84,0.1)' }]} />

        {/* ─── Share ────────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Share</Text>
          {groupId ? (
            <Pressable
              style={[styles.shareBtn, { backgroundColor: colors.sky + '18', borderColor: colors.sky }]}
              onPress={() => setShowShareModal(true)}
            >
              <Feather name="users" size={16} color={colors.sky} />
              <Text style={[styles.shareBtnText, { color: colors.sky }]}>
                {groupName ?? 'Shared group'}
              </Text>
              <Pressable hitSlop={12} onPress={() => { setGroupId(null); setGroupName(null); setDirty(true); }}>
                <Feather name="x" size={14} color={colors.sky} />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(0,0,0,0.07)', opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => setShowShareModal(true)}
            >
              <Feather name="share-2" size={18} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Share with a group</Text>
                <Text style={[styles.shareBtnDesc, { color: colors.mutedForeground }]}>
                  Collaborate with people you've added
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* ─── Actions ──────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          {/* Mark done / Reopen — big gradient button */}
          <Pressable
            style={({ pressed }) => [styles.doneWrap, { opacity: pressed ? 0.85 : 1, flex: 1 }]}
            onPress={handleToggle}
            disabled={toggleDone.isPending}
          >
            <LinearGradient
              colors={note.isDone
                ? ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.1)']
                : ['#1E5C54', '#2D7A6E']}
              style={styles.doneBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {toggleDone.isPending ? (
                <ActivityIndicator size="small" color={note.isDone ? colors.mutedForeground : '#FFFFFF'} />
              ) : (
                <>
                  {Platform.OS === 'ios' ? (
                    <SymbolView
                      name={note.isDone ? 'arrow.uturn.backward' : 'checkmark.circle.fill'}
                      tintColor={note.isDone ? colors.mutedForeground : '#FFFFFF'}
                      size={20}
                    />
                  ) : (
                    <Feather
                      name={note.isDone ? 'rotate-ccw' : 'check-circle'}
                      size={20}
                      color={note.isDone ? colors.mutedForeground : '#FFFFFF'}
                    />
                  )}
                  <Text style={[styles.doneBtnText, { color: note.isDone ? colors.mutedForeground : '#FFFFFF' }]}>
                    {note.isDone ? 'Reopen' : 'Mark done! ✓'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Delete */}
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: colors.destructive + '80', opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleDelete}
            disabled={deleteNote.isPending}
          >
            {deleteNote.isPending ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : Platform.OS === 'ios' ? (
              <SymbolView name="trash" tintColor={colors.destructive} size={20} />
            ) : (
              <Feather name="trash-2" size={20} color={colors.destructive} />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 22, gap: 20 },

  titleInput: { fontSize: 26, fontFamily: 'Manrope_700Bold' },
  bodyInput: {
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 27,
    minHeight: 140,
  },
  divider: { height: 1 },

  sectionBlock: { gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    minWidth: '45%',
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },

  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  customTimeLabel: { fontSize: 14, fontFamily: 'Manrope_500Medium' },

  sentBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sentBadgeText: { fontSize: 11, fontFamily: 'Manrope_700Bold' },

  toggleCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  toggleEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  toggleLabelCol: { flex: 1 },
  toggleTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  toggleDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  shareBtnDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  doneWrap: {},
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 30,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  doneBtnText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  deleteBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
