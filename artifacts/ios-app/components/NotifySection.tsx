import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

export type NotifyMode = 'now' | 'hour' | 'tomorrow' | 'custom' | 'off';

export type NotifyValue = {
  mode: NotifyMode;
  remindAt: Date | null;
  isPinned: boolean;
};

function getQuickReminders() {
  const now = new Date();
  const inOneHour = new Date(now);
  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return { inOneHour, tomorrow };
}

export function defaultNotifyValue(): NotifyValue {
  return { mode: 'now', remindAt: null, isPinned: true };
}

export function notifyValueFromNote(note: {
  isPinned: boolean;
  remindAt?: string | null;
}): NotifyValue {
  if (!note.isPinned && !note.remindAt) {
    return { mode: 'off', remindAt: null, isPinned: false };
  }

  if (note.isPinned && !note.remindAt) {
    return { mode: 'now', remindAt: null, isPinned: true };
  }

  if (!note.remindAt) {
    return { mode: 'off', remindAt: null, isPinned: false };
  }

  const remindAt = new Date(note.remindAt);
  const { inOneHour, tomorrow } = getQuickReminders();
  const key = remindAt.toISOString().slice(0, 16);

  if (key === inOneHour.toISOString().slice(0, 16)) {
    return { mode: 'hour', remindAt, isPinned: true };
  }
  if (key === tomorrow.toISOString().slice(0, 16)) {
    return { mode: 'tomorrow', remindAt, isPinned: true };
  }

  return { mode: 'custom', remindAt, isPinned: true };
}

export function notifyPayload(value: NotifyValue): {
  isPinned: boolean;
  remindAt: string | null;
} {
  if (value.mode === 'off') {
    return { isPinned: false, remindAt: null };
  }
  if (value.mode === 'now') {
    return { isPinned: true, remindAt: null };
  }
  return {
    isPinned: true,
    remindAt: value.remindAt?.toISOString() ?? null,
  };
}

type Props = {
  value: NotifyValue;
  onChange: (value: NotifyValue) => void;
  showDatePicker: boolean;
  onShowDatePicker: (show: boolean) => void;
};

export function NotifySection({
  value,
  onChange,
  showDatePicker,
  onShowDatePicker,
}: Props) {
  const colors = useColors();
  const { inOneHour, tomorrow } = useMemo(() => getQuickReminders(), []);

  const chips: Array<{
    mode: NotifyMode;
    icon: 'bell' | 'clock' | 'sun.max' | 'calendar';
    label: string;
    date?: Date;
  }> = [
    { mode: 'now', icon: 'bell', label: 'Remind me now' },
    { mode: 'hour', icon: 'clock', label: 'In 1 hour', date: inOneHour },
    { mode: 'tomorrow', icon: 'sun.max', label: 'Tomorrow', date: tomorrow },
    { mode: 'custom', icon: 'calendar', label: customLabel(value.remindAt, value.mode) },
  ];

  const pick = (mode: NotifyMode, date?: Date) => {
    Haptics.selectionAsync();
    if (mode === 'custom') {
      onShowDatePicker(true);
      if (value.mode !== 'custom') {
        onChange({
          mode: 'custom',
          remindAt: value.remindAt ?? new Date(Date.now() + 3600_000),
          isPinned: true,
        });
      }
      return;
    }

    if (value.mode === mode) {
      onChange({ mode: 'off', remindAt: null, isPinned: false });
      return;
    }

    onChange({
      mode,
      remindAt: mode === 'now' ? null : (date ?? null),
      isPinned: true,
    });
  };

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') onShowDatePicker(false);
    if (!selected) return;
    onChange({ mode: 'custom', remindAt: selected, isPinned: true });
  };

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notify</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.chipRow}>
          {chips.map((chip) => {
            const active = value.mode === chip.mode;
            return (
              <Pressable
                key={chip.mode}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.muted,
                  },
                ]}
                onPress={() => pick(chip.mode, chip.date)}
              >
                <AppIcon
                  name={chip.icon}
                  size={13}
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? colors.primaryForeground : colors.foreground,
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showDatePicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value.remindAt ?? new Date()}
              mode="datetime"
              minimumDate={new Date()}
              onChange={handleDateChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                style={[styles.pickerDone, { backgroundColor: colors.primary }]}
                onPress={() => onShowDatePicker(false)}
              >
                <Text style={[styles.pickerDoneText, { color: colors.primaryForeground }]}>
                  Done
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function customLabel(remindAt: Date | null, mode: NotifyMode): string {
  if (mode !== 'custom' || !remindAt) return 'Custom';
  return remindAt.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  pickerWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  pickerDone: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pickerDoneText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
});
