import React, { useLayoutEffect, useState } from 'react';
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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useCreateNote,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ShareGroupPicker } from '@/components/ShareGroupPicker';
import { AppIcon } from '@/components/AppIcon';
import { useScreenGutter } from '@/constants/layout';
import { presentPinnedNoteNotification } from '@/utils/pinnedNoteNotification';
import { ensureLocalNotificationPermission } from '@/utils/notificationPermissions';

// ─── Quick reminder presets ───────────────────────────────────────────────────

function getQuickReminders() {
  const now = new Date();

  const inOneHour = new Date(now);
  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  return [
    {
      icon: 'clock' as const,
      label: 'In 1 hour',
      date: inOneHour,
    },
    {
      icon: 'sun.max' as const,
      label: 'Tomorrow',
      date: tomorrow,
    },
  ];
}

// ─── Section Card ─────────────────────────────────────────────────────────────

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
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetNotesSummaryQueryKey(),
        });
      },
    },
  });

  const canSave = body.trim().length > 0;

  const handleCreate = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPinned && !remindAt) {
      const granted = await ensureLocalNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications needed',
          'Allow notifications in Settings to pin notes to your lock screen.',
        );
        return;
      }
    }
    try {
      const created = await createNote.mutateAsync({
        data: {
          title: null,
          body: body.trim(),
          isUrgent,
          isPinned,
          groupId: groupId || null,
          remindAt: remindAt ? remindAt.toISOString() : null,
        },
      });
      if (isPinned && !remindAt) {
        await presentPinnedNoteNotification({
          id: created.id,
          body: body.trim(),
          title: created.title,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save that note. Please try again.');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: colors.primary, fontSize: 17 }}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => void handleCreate()}
          disabled={!canSave || createNote.isPending}
          hitSlop={12}
        >
          {createNote.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={{
                color: canSave ? colors.primary : colors.mutedForeground,
                fontSize: 17,
                fontWeight: '600',
              }}
            >
              Add
            </Text>
          )}
        </Pressable>
      ),
    });
  }, [canSave, createNote.isPending, body, isUrgent, isPinned, groupId, remindAt]);

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) setRemindAt(selected);
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Body input */}
        <TextInput
          style={[
            styles.bodyInput,
            {
              color: colors.foreground,
              backgroundColor: colors.secondary,
              borderRadius: colors.radius,
            },
          ]}
          placeholder="Write a note..."
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={setBody}
          multiline
          autoFocus
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
                      backgroundColor: active
                        ? colors.secondary
                        : colors.muted,
                      borderRadius: 10,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRemindAt(active ? null : r.date);
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
              <AppIcon
                name="calendar"
                size={13}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.remindChipText,
                  { color: colors.mutedForeground },
                ]}
              >
                {reminderLabel && !quickReminders.some(
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
                  style={[
                    styles.pickerDone,
                    { backgroundColor: colors.primary },
                  ]}
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

        <SectionCard title="Select Group">
          <View style={styles.groupPickerWrap}>
            <ShareGroupPicker
              showTitle={false}
              selectedGroupId={groupId}
              onSelect={(id) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setGroupId(id);
              }}
            />
          </View>
        </SectionCard>

        {/* Options */}
        <SectionCard title="Options">
          {/* Mark as Urgent */}
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
              style={[
                styles.optionIconWrap,
                { backgroundColor: colors.secondary },
              ]}
            >
              <AppIcon name="exclamationmark.circle" size={14} color={colors.urgent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Mark as Urgent
              </Text>
              <Text style={[styles.optionHint, { color: colors.mutedForeground }]}>
                Red badge on the list; time-sensitive when a reminder fires
              </Text>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsUrgent(v);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* Pin to Lock Screen */}
          <View style={styles.optionRow}>
            <View
              style={[
                styles.optionIconWrap,
                { backgroundColor: colors.secondary },
              ]}
            >
              <AppIcon name="lock.fill" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground, flex: 1 }]}>
              Pin to Lock Screen
            </Text>
            <Switch
              value={isPinned}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                void (async () => {
                  if (v) {
                    const granted = await ensureLocalNotificationPermission();
                    if (!granted) {
                      Alert.alert(
                        'Notifications needed',
                        'Allow notifications in Settings to pin notes to your lock screen.',
                      );
                      return;
                    }
                  }
                  setIsPinned(v);
                })();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  content: { paddingTop: 16, gap: 24 },

  bodyInput: {
    minHeight: 140,
    padding: 16,
    fontSize: 22,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 32,
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
  optionLabel: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  optionHint: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2, lineHeight: 16 },
});
