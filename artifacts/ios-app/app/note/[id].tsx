import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useGetNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNoteDone,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
  getGetNoteQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ShareGroupPicker } from '@/components/ShareGroupPicker';
import {
  clearPinnedNoteNotification,
  presentPinnedNoteNotification,
} from '@/utils/pinnedNoteNotification';
import { dismissNoteNotification } from '@/utils/notifications';
import { AppIcon } from '@/components/AppIcon';
import { confirmDestructive } from '@/utils/iosConfirm';
import { useScreenGutter } from '@/constants/layout';

function getQuickReminders() {
  const now = new Date();
  const inOneHour = new Date(now);
  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return [
    { icon: 'clock' as const, label: 'In 1 hour', date: inOneHour },
    { icon: 'sun.max' as const, label: 'Tomorrow', date: tomorrow },
  ];
}

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
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
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

export default function NoteDetailScreen() {
  const colors = useColors();
  const gutter = useScreenGutter();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const hydratedRef = useRef(false);
  const bodyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doneBtnScale = useSharedValue(1);
  const doneBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneBtnScale.value }],
  }));
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!note) return;
    hydratedRef.current = false;
    setBody(note.body);
    setIsUrgent(note.isUrgent);
    setIsPinned(note.isPinned);
    setGroupId(note.groupId ?? null);
    setGroupName(note.groupName ?? null);
    setRemindAt(note.remindAt ? new Date(note.remindAt) : null);
    hydratedRef.current = true;
  }, [note?.id]);

  const invalidateNoteQueries = useCallback(async () => {
    if (!id) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(id) }),
    ]);
  }, [id, queryClient]);

  const persistNote = useCallback(
    async (patch: {
      body?: string;
      isUrgent?: boolean;
      isPinned?: boolean;
      groupId?: string | null;
      remindAt?: string | null;
    }) => {
      if (!id || !note || !hydratedRef.current) return;

      const nextBody = (patch.body ?? body.trim()) || note.body;
      const nextUrgent = patch.isUrgent ?? isUrgent;
      const nextPinned = patch.isPinned ?? isPinned;
      const nextGroupId =
        patch.groupId !== undefined ? patch.groupId : groupId;
      const nextRemindAt =
        patch.remindAt !== undefined
          ? patch.remindAt
          : remindAt
            ? remindAt.toISOString()
            : null;

      const wasPinned = note.isPinned;

      try {
        const updated = await updateNote.mutateAsync({
          id,
          data: {
            body: nextBody,
            isUrgent: nextUrgent,
            isPinned: nextPinned,
            groupId: nextGroupId,
            remindAt: nextRemindAt,
          },
        });

        if (patch.body !== undefined) setBody(nextBody);
        if (patch.isUrgent !== undefined) setIsUrgent(nextUrgent);
        if (patch.isPinned !== undefined) setIsPinned(nextPinned);
        if (patch.groupId !== undefined) {
          setGroupId(nextGroupId);
          setGroupName(updated.groupName ?? null);
        }
        if (patch.remindAt !== undefined) {
          setRemindAt(nextRemindAt ? new Date(nextRemindAt) : null);
        }

        if (!wasPinned && nextPinned && !nextRemindAt) {
          await presentPinnedNoteNotification({
            id,
            body: nextBody,
            title: updated.title,
          });
        } else if (wasPinned && !nextPinned) {
          await clearPinnedNoteNotification(id);
          await dismissNoteNotification(id);
        }

        await invalidateNoteQueries();
      } catch {
        Alert.alert('Error', 'Could not save. Please try again.');
      }
    },
    [
      id,
      note,
      body,
      isUrgent,
      isPinned,
      groupId,
      remindAt,
      updateNote,
      invalidateNoteQueries,
    ],
  );

  useEffect(() => {
    if (!note || !hydratedRef.current) return;
    if (body.trim() === note.body) return;

    if (bodyDebounceRef.current) clearTimeout(bodyDebounceRef.current);
    bodyDebounceRef.current = setTimeout(() => {
      void persistNote({ body: body.trim() });
    }, 700);

    return () => {
      if (bodyDebounceRef.current) clearTimeout(bodyDebounceRef.current);
    };
  }, [body, note?.body, persistNote]);

  const handleDelete = useCallback(() => {
    confirmDestructive({
      title: 'Delete note',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        if (!id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
          await deleteNote.mutateAsync({ id });
          await clearPinnedNoteNotification(id);
          await dismissNoteNotification(id);
          await invalidateNoteQueries();
          router.replace('/(tabs)');
        } catch {
          Alert.alert('Error', 'Could not delete this note.');
        }
      },
    });
  }, [id, deleteNote, invalidateNoteQueries]);

  const handleToggleDone = useCallback(async () => {
    if (!id || !note) return;

    doneBtnScale.value = withSequence(
      withSpring(0.9, { damping: 4, stiffness: 350 }),
      withSpring(1.12, { damping: 3, stiffness: 400, mass: 0.5 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const wasDone = note.isDone;
    if (!wasDone) setConfettiTrigger((n) => n + 1);

    try {
      await toggleDone.mutateAsync({ id });
      if (!wasDone) {
        await dismissNoteNotification(id);
        await clearPinnedNoteNotification(id);
        await invalidateNoteQueries();
        router.replace('/(tabs)');
        return;
      }
      await invalidateNoteQueries();
    } catch {
      Alert.alert('Error', 'Could not update this note.');
    }
  }, [id, note, toggleDone, invalidateNoteQueries, doneBtnScale]);

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) {
      setRemindAt(selected);
      void persistNote({ remindAt: selected.toISOString() });
    }
  };

  const handleShareSelect = async (selectedGroupId: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await persistNote({ groupId: selectedGroupId });
    setGroupName(name);
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isDone = note.isDone;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      >
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
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

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
                    const next = active ? null : r.date;
                    setRemindAt(next);
                    void persistNote({
                      remindAt: next ? next.toISOString() : null,
                    });
                  }}
                >
                  <AppIcon
                    name={r.icon}
                    size={13}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.remindChipText,
                      {
                        color: active ? colors.primary : colors.mutedForeground,
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
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                  borderRadius: 10,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker(true);
              }}
            >
              <AppIcon name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.remindChipText, { color: colors.mutedForeground }]}>
                {reminderLabel ?? 'Custom'}
              </Text>
            </Pressable>
          </View>

          {showDatePicker ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={remindAt ?? new Date()}
                mode="datetime"
                minimumDate={new Date()}
                onChange={handleDateChange}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  style={[styles.pickerDone, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text
                    style={[styles.pickerDoneText, { color: colors.primaryForeground }]}
                  >
                    Done
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Select Group">
          <View style={styles.groupPickerWrap}>
            <ShareGroupPicker
              showTitle={false}
              selectedGroupId={groupId}
              onSelect={(id, name) => {
                void handleShareSelect(id, name);
              }}
            />
          </View>
        </SectionCard>

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
              <AppIcon name="exclamationmark.circle" size={14} color={colors.urgent} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>
              Mark as Urgent
            </Text>
            <Switch
              value={isUrgent}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsUrgent(v);
                void persistNote({ isUrgent: v });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>

          <View style={styles.optionRow}>
            <View
              style={[styles.optionIconWrap, { backgroundColor: colors.secondary }]}
            >
              <AppIcon name="lock.fill" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>
              Pin to Lock Screen
            </Text>
            <Switch
              value={isPinned}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsPinned(v);
                void persistNote({ isPinned: v });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>
        </SectionCard>

        <View style={styles.actions}>
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
                <AppIcon
                  name={isDone ? 'arrow.counterclockwise' : 'checkmark'}
                  size={18}
                  color={isDone ? colors.foreground : colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.doneBtnText,
                    {
                      color: isDone ? colors.foreground : colors.primaryForeground,
                    },
                  ]}
                >
                  {isDone ? 'Mark undone' : 'Mark done'}
                </Text>
              </Pressable>
            </Animated.View>
            <View pointerEvents="none" style={styles.confettiAnchor}>
              <ConfettiBurst trigger={confettiTrigger} size={240} />
            </View>
          </View>

          <Pressable
            style={[
              styles.deleteBtn,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={handleDelete}
          >
            <AppIcon name="trash" size={18} color={colors.destructive} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 16, paddingBottom: 40, gap: 24 },
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
  groupPickerWrap: { padding: 14 },
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
});
