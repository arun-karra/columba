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
} from 'react-native';
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

export default function NewNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
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
          title: title.trim() || null,
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
      Alert.alert('Error', 'Could not create note. Please try again.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Modal header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 14),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Note</Text>
        <Pressable
          style={[
            styles.addBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.muted,
              borderRadius: colors.radius / 2,
            },
          ]}
          onPress={handleCreate}
          disabled={createNote.isPending || !canSave}
        >
          {createNote.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.addBtnText,
                { color: canSave ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              Add
            </Text>
          )}
        </Pressable>
      </View>

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
          onChangeText={setTitle}
          returnKeyType="next"
        />

        {/* Body */}
        <TextInput
          style={[styles.bodyInput, { color: colors.foreground }]}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Flags ─────────────────────────────────────────────────── */}

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
            onValueChange={setIsUrgent}
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
            <Text style={[styles.metaLabel, { color: colors.foreground }]}>
              Add to Home Screen
            </Text>
            <Text style={[styles.metaDesc, { color: colors.mutedForeground }]}>
              Keeps this note on your lock screen until completed
            </Text>
          </View>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            trackColor={{ false: colors.muted, true: colors.primary + 'bb' }}
            thumbColor={isPinned ? colors.primary : colors.mutedForeground}
          />
        </View>

        {/* Reminder */}
        <Pressable
          style={styles.metaRow}
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
          <Feather
            name="clock"
            size={18}
            color={remindAt ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.metaLabel,
              { color: remindAt ? colors.foreground : colors.mutedForeground, flex: 1 },
            ]}
          >
            {remindAt
              ? remindAt.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Set reminder'}
          </Text>
          {remindAt && (
            <Pressable
              hitSlop={12}
              onPress={(e) => {
                e.stopPropagation();
                setRemindAt(null);
                setShowDatePicker(false);
              }}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
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
            themeVariant="light"
            accentColor={colors.primary}
          />
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Share ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            SHARE
          </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  addBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  addBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  scroll: { padding: 20, gap: 0 },
  titleInput: { fontSize: 24, fontFamily: 'Manrope_700Bold', marginBottom: 12 },
  bodyInput: {
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 27,
    minHeight: 180,
    marginBottom: 24,
  },
  divider: { height: 1, marginVertical: 4 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  metaLabel: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  metaLabelCol: { flex: 1 },
  metaDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

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
});
