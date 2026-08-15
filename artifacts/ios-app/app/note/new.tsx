import React, { useState } from 'react';
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
  ScrollView,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ShareModal } from '@/components/ShareModal';

// ─── Quick reminder presets ───────────────────────────────────────────────────

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
    { emoji: '⚡', label: 'In 1 hour', color: '#F5A623', date: inOneHour },
    { emoji: '🌙', label: 'Tonight 7pm', color: '#9B8FE8', date: tonight },
    { emoji: '☀️', label: 'Tomorrow 9am', color: '#5BB8F5', date: tomorrow },
    { emoji: '📅', label: 'Next week', color: '#34C88A', date: nextWeek },
  ];
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
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
        queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
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
      Alert.alert('Hmm…', 'Could not save that note. Give it another go!');
    }
  };

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

      {/* Header */}
      <BlurView
        intensity={scheme === 'dark' ? 40 : 55}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 14) },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Note</Text>
        <View style={{ width: 44 }} />
      </BlurView>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Body input */}
        <TextInput
          style={[styles.bodyInput, { color: colors.foreground }]}
          placeholder={"What needs doing? 🤔"}
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* ─── Reminder section ─────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            ⏰  Remind me
          </Text>

          {/* Quick preset chips */}
          <View style={styles.chipGrid}>
            {presets.map((p) => {
              const isActive = remindAt?.getTime() === p.date.getTime();
              return (
                <Pressable
                  key={p.label}
                  style={({ pressed }) => [
                    styles.reminderChip,
                    {
                      backgroundColor: isActive ? p.color : 'rgba(255,255,255,0.7)',
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
                  }}
                >
                  <Text style={styles.reminderChipEmoji}>{p.emoji}</Text>
                  <Text
                    style={[
                      styles.reminderChipLabel,
                      { color: isActive ? '#FFFFFF' : colors.foreground },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom time picker toggle */}
          <Pressable
            style={[
              styles.customTimeRow,
              {
                backgroundColor: remindAt && !presets.some(p => p.date.getTime() === remindAt?.getTime())
                  ? colors.sky + '20'
                  : 'rgba(255,255,255,0.5)',
                borderColor: 'rgba(0,0,0,0.07)',
              },
            ]}
            onPress={() => {
              if (!remindAt) {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                setRemindAt(d);
              }
              setShowDatePicker((v) => !v);
            }}
          >
            <Feather name="clock" size={16} color={remindAt ? colors.sky : colors.mutedForeground} />
            <Text style={[styles.customTimeLabel, { color: remindAt ? colors.foreground : colors.mutedForeground, flex: 1 }]}>
              {reminderLabel ?? 'Pick a custom time…'}
            </Text>
            {remindAt && (
              <Pressable
                hitSlop={14}
                onPress={(e) => {
                  e.stopPropagation();
                  setRemindAt(null);
                  setShowDatePicker(false);
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
                if (date) setRemindAt(date);
              }}
              themeVariant={scheme === 'dark' ? 'dark' : 'light'}
              accentColor={colors.primary}
            />
          )}
        </View>

        {/* ─── Flags ────────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Options</Text>

          <View style={[styles.toggleCard, { backgroundColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(0,0,0,0.07)' }]}>
            {/* Urgent */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleEmoji}>🔥</Text>
              <View style={styles.toggleLabel}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Urgent</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Moves this to the top</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setIsUrgent(v);
                }}
                trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.urgent + 'cc' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />

            {/* Pin to Home Screen */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleEmoji}>📌</Text>
              <View style={styles.toggleLabel}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Lock screen</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                  {remindAt ? 'Notification at reminder time' : 'Always visible on lock screen'}
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setIsPinned(v);
                }}
                trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.accent + 'cc' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* ─── Share ────────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Share</Text>
          {groupId ? (
            <Pressable
              style={[styles.groupBadge, { backgroundColor: colors.sky + '18', borderColor: colors.sky }]}
              onPress={() => setShowShareModal(true)}
            >
              <Feather name="users" size={16} color={colors.sky} />
              <Text style={[styles.groupBadgeText, { color: colors.sky }]}>
                {groupName ?? 'Shared group'}
              </Text>
              <Pressable hitSlop={12} onPress={() => { setGroupId(null); setGroupName(null); }}>
                <Feather name="x" size={14} color={colors.sky} />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.shareBtn,
                {
                  backgroundColor: 'rgba(255,255,255,0.65)',
                  borderColor: 'rgba(0,0,0,0.07)',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => setShowShareModal(true)}
            >
              <Feather name="share-2" size={18} color={colors.mutedForeground} />
              <View style={styles.shareBtnLabel}>
                <Text style={[styles.shareBtnTitle, { color: colors.foreground }]}>Share with a group</Text>
                <Text style={[styles.shareBtnDesc, { color: colors.mutedForeground }]}>
                  Collaborate with people you've added
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* ─── Big add button ───────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 8, marginBottom: 24 })}
          onPress={handleCreate}
          disabled={createNote.isPending || !canSave}
        >
          <LinearGradient
            colors={canSave ? ['#1E5C54', '#2D7A6E'] : ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.12)']}
            style={styles.addBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {createNote.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.addBtnText, { color: canSave ? '#FFFFFF' : colors.mutedForeground }]}>
                {canSave ? 'Add note ✓' : 'Write something first…'}
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <ShareModal
        visible={showShareModal}
        selectedGroupId={groupId}
        onClose={() => setShowShareModal(false)}
        onSelect={(gid, gname) => {
          setGroupId(gid);
          setGroupName(gname ?? null);
          setShowShareModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
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
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,92,84,0.1)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30,92,84,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },

  scroll: { padding: 20, gap: 20 },

  bodyInput: {
    fontSize: 20,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 30,
    minHeight: 160,
  },

  sectionBlock: { gap: 12 },
  sectionTitle: { fontSize: 13, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.8 },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: '45%',
    flex: 1,
  },
  reminderChipEmoji: { fontSize: 18 },
  reminderChipLabel: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },

  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  customTimeLabel: { fontSize: 14, fontFamily: 'Manrope_500Medium' },

  toggleCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  toggleEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  toggleLabel: { flex: 1 },
  toggleTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  toggleDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  divider: { height: 1, marginHorizontal: 18 },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  shareBtnLabel: { flex: 1 },
  shareBtnTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  shareBtnDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  groupBadgeText: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  addBtn: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  addBtnText: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
});
