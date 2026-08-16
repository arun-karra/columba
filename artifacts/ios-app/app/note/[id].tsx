import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
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
import { ShareModal } from '@/components/ShareModal';
import { dismissNoteNotification } from '@/utils/notifications';

// ─── Quick reminder presets ────────────────────────────────────────────────────

function getQuickReminders() {
  const now = new Date();

  const inOneHour = new Date(now);
  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  return [
    { icon: 'clock' as const, label: 'In 1 hour', date: inOneHour },
    { icon: 'sun' as const, label: 'Tomorrow', date: tomorrow },
  ];
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NoteDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: note, isLoading } = useGetNote(id ?? '');

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const toggleDone = useToggleNoteDone();

  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Done-button spring animation
  const doneBtnScale = useSharedValue(1);
  const doneBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneBtnScale.value }],
  }));

  // Confetti burst
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!note) return;
    setBody(note.body);
    setIsUrgent(note.isUrgent);
    setIsPinned(note.isPinned);
    setGroupId(note.groupId ?? null);
    setGroupName(note.groupName ?? null);
    setRemindAt(note.remindAt ? new Date(note.remindAt) : null);
    setDirty(false);
  }, [note]);

  // Nav header save button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        dirty ? (
          <Pressable
            onPress={handleSave}
            style={{ marginRight: 16 }}
            hitSlop={12}
          >
            <Text
              style={{
                color: colors.primary,
                fontFamily: 'Manrope_600SemiBold',
                fontSize: 16,
              }}
            >
              Save
            </Text>
          </Pressable>
        ) : null,
    });
  }, [dirty, body, isUrgent, isPinned, remindAt, groupId]);

  const handleSave = useCallback(async () => {
    if (!id || !note) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateNote.mutateAsync({
        id,
        data: {
          body: body.trim() || note.body,
          isUrgent,
          isPinned,
          groupId: groupId || null,
          remindAt: remindAt ? remindAt.toISOString() : null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetNotesSummaryQueryKey(),
      });
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  }, [id, note, body, isUrgent, isPinned, remindAt, groupId]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await deleteNote.mutateAsync({ id });
            void dismissNoteNotification(id);
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
            queryClient.invalidateQueries({
              queryKey: getGetNotesSummaryQueryKey(),
            });
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete this note.');
          }
        },
      },
    ]);
  }, [id]);

  const handleToggleDone = useCallback(async () => {
    if (!id || !note) return;

    doneBtnScale.value = withSequence(
      withSpring(0.9, { damping: 4, stiffness: 350 }),
      withSpring(1.12, { damping: 3, stiffness: 400, mass: 0.5 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!note.isDone) {
      setConfettiTrigger((n) => n + 1);
    }

    try {
      await toggleDone.mutateAsync({ id });
      if (!note.isDone) {
        void dismissNoteNotification(id);
      }
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetNotesSummaryQueryKey(),
      });
    } catch {
      Alert.alert('Error', 'Could not update this note.');
    }
  }, [id, note]);

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) {
      setRemindAt(selected);
      setDirty(true);
    }
  };

  const quickReminders = getQuickReminders();

  const reminderLabel = remindAt
    ? remindAt.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (isLoading || !note) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isDone = note.isDone;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Body input */}
        <TextInput
          style={[
            styles.bodyInput,
            {
              color: colors.foreground,
              backgroundColor: colors.secondary,
              borderRadius: colors.radius,
              textDecorationLine: isDone ? 'line-through' : 'none',
            },
          ]}
          placeholder="Write a note..."
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={(t) => {
            setBody(t);
            setDirty(true);
          }}
          multiline
          textAlignVertical="top"
        />

        {/* Remind Me */}
        <SectionCard title="Remind Me">
          <View style={styles.remindRow}>
            {quickReminders.map((r, i) => {
              const active =
                remindAt?.toISOString().slice(0, 16) ===
                r.date.toISOString().slice(0, 16);
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.remindChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.secondary : colors.muted,
                      borderRadius: 10,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRemindAt(active ? null : r.date);
                    setDirty(true);
                  }}
                >
                  <Feather
                    name={r.icon}
                    size={13}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.remindChipText,
                      {
                        color: active
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[
                styles.remindChip,
                {
                  borderColor:
                    remindAt &&
                    !quickReminders.some(
                      (r) =>
                        r.date.toISOString().slice(0, 16) ===
                        remindAt.toISOString().slice(0, 16),
                    )
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    remindAt &&
                    !quickReminders.some(
                      (r) =>
                        r.date.toISOString().slice(0, 16) ===
                        remindAt.toISOString().slice(0, 16),
                    )
                      ? colors.secondary
                      : colors.muted,
                  borderRadius: 10,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker(true);
              }}
            >
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text
                style={[styles.remindChipText, { color: colors.mutedForeground }]}
              >
                {reminderLabel &&
                !quickReminders.some(
                  (r) =>
                    r.date.toISOString().slice(0, 16) ===
                    remindAt?.toISOString().slice(0, 16),
                )
                  ? reminderLabel
                  : 'Custom'}
              </Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={remindAt ?? new Date()}
                mode="datetime"
                minimumDate={new Date()}
                onChange={handleDateChange}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  style={[styles.pickerDone, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text
                    style={[
                      styles.pickerDoneText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </SectionCard>

        {/* Options */}
        <SectionCard title="Options">
          <View
            style={[
              styles.optionRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.optionIconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather name="alert-circle" size={14} color={colors.urgent} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>
              Mark as Urgent
            </Text>
            <Switch
              value={isUrgent}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsUrgent(v);
                setDirty(true);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>

          <View
            style={[
              styles.optionRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.optionIconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather name="lock" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>
              Pin to Lock Screen
            </Text>
            <Switch
              value={isPinned}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsPinned(v);
                setDirty(true);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>

          <Pressable
            style={styles.optionRow}
            onPress={() => setShowShareModal(true)}
          >
            <View
              style={[styles.optionIconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather name="users" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Share to Group
              </Text>
              {groupName ? (
                <Text
                  style={[styles.optionSub, { color: colors.mutedForeground }]}
                >
                  {groupName}
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </SectionCard>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Done / Undone */}
          <View style={styles.doneWrap}>
            <Animated.View style={[styles.doneBtnOuter, doneBtnAnimStyle]}>
              <Pressable
                style={[
                  styles.doneBtn,
                  {
                    backgroundColor: isDone ? colors.secondary : colors.primary,
                    borderColor: isDone ? colors.border : 'transparent',
                    borderWidth: isDone ? 1 : 0,
                  },
                ]}
                onPress={handleToggleDone}
                disabled={toggleDone.isPending}
              >
                <Feather
                  name={isDone ? 'rotate-ccw' : 'check'}
                  size={18}
                  color={isDone ? colors.foreground : colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.doneBtnText,
                    {
                      color: isDone
                        ? colors.foreground
                        : colors.primaryForeground,
                    },
                  ]}
                >
                  {isDone ? 'Mark undone' : 'Mark done'}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Confetti anchor */}
            <View
              pointerEvents="none"
              style={styles.confettiAnchor}
            >
              <ConfettiBurst trigger={confettiTrigger} size={240} />
            </View>
          </View>

          {/* Delete */}
          <Pressable
            style={[
              styles.deleteBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </Pressable>
        </View>

        {/* Save if dirty */}
        {dirty && (
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={updateNote.isPending}
          >
            {updateNote.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                Save changes
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSelect={(id, name) => {
          setGroupId(id);
          setGroupName(name);
          setShowShareModal(false);
          setDirty(true);
        }}
        selectedGroupId={groupId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 24 },

  bodyInput: {
    minHeight: 130,
    padding: 16,
    fontSize: 20,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  remindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  remindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  remindChipText: { fontSize: 13, fontFamily: 'Manrope_500Medium' },

  pickerWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  pickerDone: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pickerDoneText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionLabel: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium' },
  optionSub: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 1 },

  actions: { flexDirection: 'row', gap: 12 },

  doneWrap: { flex: 1, position: 'relative' },
  doneBtnOuter: { flex: 1 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
  },
  doneBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  confettiAnchor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -120,
    marginLeft: -120,
    pointerEvents: 'none',
  },

  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
