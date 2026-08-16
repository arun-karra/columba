import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useCreateNote,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ShareModal } from '@/components/ShareModal';

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
      icon: 'sun' as const,
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
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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
    try {
      await createNote.mutateAsync({
        data: {
          title: null,
          body: body.trim(),
          isUrgent,
          isPinned,
          groupId: groupId || null,
          remindAt: remindAt ? remindAt.toISOString() : null,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save that note. Please try again.');
    }
  };

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
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0),
        },
      ]}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Pressable
          style={[
            styles.saveBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.secondary,
            },
          ]}
          onPress={handleCreate}
          disabled={!canSave || createNote.isPending}
        >
          {createNote.isPending ? (
            <ActivityIndicator
              size="small"
              color={canSave ? colors.primaryForeground : colors.mutedForeground}
            />
          ) : (
            <Text
              style={[
                styles.saveBtnText,
                {
                  color: canSave
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              SAVE
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
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
                  <Feather
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
              <Feather
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
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* Share to Group */}
          <Pressable
            style={[
              styles.optionRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
            ]}
            onPress={() => setShowShareModal(true)}
          >
            <View
              style={[
                styles.optionIconWrap,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Feather name="users" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Share to Group
              </Text>
              {groupName ? (
                <Text
                  style={[
                    styles.optionSub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {groupName}
                </Text>
              ) : null}
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </SectionCard>
      </ScrollView>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSelect={(id, name) => {
          setGroupId(id);
          setGroupName(name);
          setShowShareModal(false);
        }}
        selectedGroupId={groupId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    paddingHorizontal: 20,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  saveBtnText: { fontSize: 13, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 },

  content: { paddingHorizontal: 20, paddingTop: 8, gap: 24 },

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
});
