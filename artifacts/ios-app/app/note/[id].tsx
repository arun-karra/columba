import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ConfettiBurst } from '@/components/ConfettiBurst';
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
  NotifySection,
  notifyPayload,
  notifyValueFromNote,
  type NotifyValue,
} from '@/components/NotifySection';
import { SlideToComplete } from '@/components/SlideToComplete';
import {
  clearPinnedNoteNotification,
  presentPinnedNoteNotification,
} from '@/utils/pinnedNoteNotification';
import { dismissNoteNotification } from '@/utils/notifications';
import { ensureLocalNotificationPermission } from '@/utils/notificationPermissions';
import { AppIcon } from '@/components/AppIcon';
import { confirmDestructive } from '@/utils/iosConfirm';
import { getNoteNotificationStatus } from '@/utils/noteNotificationStatus';
import { canResendNoteNotification, resendNoteNotification } from '@/utils/resendNoteNotification';
import { useScreenGutter } from '@/constants/layout';
import { ScreenGradient } from '@/components/ScreenGradient';

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
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [notify, setNotify] = useState<NotifyValue>(notifyValueFromNote({ isPinned: true, remindAt: null }));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const hydratedRef = useRef(false);
  const bodyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!note) return;
    hydratedRef.current = false;
    setBody(note.body);
    setGroupId(note.groupId ?? null);
    setGroupName(note.groupName ?? null);
    setNotify(notifyValueFromNote(note));
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
      isPinned?: boolean;
      groupId?: string | null;
      remindAt?: string | null;
    }) => {
      if (!id || !note || !hydratedRef.current) return;

      const nextBody = (patch.body ?? body.trim()) || note.body;
      const nextPinned = patch.isPinned ?? notify.isPinned;
      const nextGroupId = patch.groupId !== undefined ? patch.groupId : groupId;
      const nextRemindAt =
        patch.remindAt !== undefined
          ? patch.remindAt
          : notify.remindAt
            ? notify.remindAt.toISOString()
            : null;

      const wasPinned = note.isPinned;
      const hadImmediatePin = wasPinned && !note.remindAt;

      try {
        const updated = await updateNote.mutateAsync({
          id,
          data: {
            body: nextBody,
            isPinned: nextPinned,
            groupId: nextGroupId,
            remindAt: nextRemindAt,
          },
        });

        if (patch.body !== undefined) setBody(nextBody);
        if (patch.groupId !== undefined) {
          setGroupId(nextGroupId);
          setGroupName(updated.groupName ?? null);
        }
        if (patch.isPinned !== undefined || patch.remindAt !== undefined) {
          setNotify(notifyValueFromNote(updated));
        }

        const nowImmediate = nextPinned && !nextRemindAt;
        if (!hadImmediatePin && nowImmediate) {
          const shown = await presentPinnedNoteNotification({
            id,
            body: nextBody,
            groupId: updated.groupId,
            groupName: updated.groupName,
            groupEmoji: updated.groupEmoji,
          });
          if (!shown) {
            Alert.alert(
              'Notifications needed',
              'Allow notifications in Settings to show notes on your lock screen.',
            );
          }
        } else if (hadImmediatePin && !nowImmediate) {
          await clearPinnedNoteNotification(id);
          await dismissNoteNotification(id);
        } else if (!nextPinned) {
          await clearPinnedNoteNotification(id);
          await dismissNoteNotification(id);
        }

        await invalidateNoteQueries();
      } catch {
        Alert.alert('Error', 'Could not save. Please try again.');
      }
    },
    [id, note, body, notify, groupId, updateNote, invalidateNoteQueries],
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

  const handleNotifyChange = useCallback(
    async (next: NotifyValue) => {
      const previous = notify;
      setNotify(next);

      if (next.mode !== 'off') {
        const granted = await ensureLocalNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Notifications needed',
            'Allow notifications in Settings to show notes on your lock screen.',
          );
          setNotify(previous);
          return;
        }
      }

      const payload = notifyPayload(next);
      await persistNote({
        isPinned: payload.isPinned,
        remindAt: payload.remindAt,
      });
    },
    [notify, persistNote],
  );

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
  }, [id, note, toggleDone, invalidateNoteQueries]);

  const handleShareSelect = async (selectedGroupId: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await persistNote({ groupId: selectedGroupId });
    setGroupName(name);
  };

  const handleResendNotification = useCallback(async () => {
    if (!note) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await resendNoteNotification(note);
  }, [note]);

  const notificationStatus = note ? getNoteNotificationStatus(note) : null;
  const showResend = note ? canResendNoteNotification(note) && !note.isDone : false;

  if (isLoading || !note) {
    return (
      <ScreenGradient>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenGradient>
    );
  }

  const isDone = note.isDone;

  return (
    <ScreenGradient>
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

        <NotifySection
          value={notify}
          onChange={(next) => {
            void handleNotifyChange(next);
          }}
          showDatePicker={showDatePicker}
          onShowDatePicker={setShowDatePicker}
        />

        {notificationStatus ? (
          <View style={styles.notifyStatusRow}>
            <AppIcon name="bell" size={14} color={colors.primary} />
            <Text style={[styles.notifyStatusText, { color: colors.primary }]}>
              {notificationStatus}
            </Text>
          </View>
        ) : null}

        {showResend ? (
          <Pressable
            style={[
              styles.resendBtn,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={() => {
              void handleResendNotification();
            }}
            accessibilityRole="button"
            accessibilityLabel="Resend notification"
          >
            <AppIcon name="bell" size={18} color={colors.primary} />
            <Text style={[styles.resendBtnText, { color: colors.primary }]}>
              Resend notification
            </Text>
          </Pressable>
        ) : null}

        <SectionCard title="Select Group">
          <View style={styles.groupPickerWrap}>
            <ShareGroupPicker
              showTitle={false}
              selectedGroupId={groupId}
              onSelect={(groupIdValue, name) => {
                void handleShareSelect(groupIdValue, name);
              }}
            />
          </View>
        </SectionCard>

        {!isDone ? (
          <View style={styles.actions}>
            <View style={styles.slideWrap}>
              <SlideToComplete
                key="complete"
                disabled={toggleDone.isPending}
                onComplete={() => {
                  void handleToggleDone();
                }}
              />
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
        ) : (
          <View style={styles.actions}>
            <View style={styles.slideWrap}>
              <SlideToComplete
                key="reopen"
                label="Slide to reopen"
                disabled={toggleDone.isPending}
                onComplete={() => {
                  void handleToggleDone();
                }}
              />
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
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
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
  groupPickerWrap: { padding: 14 },
  notifyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -12,
  },
  notifyStatusText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: -8,
  },
  resendBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  slideWrap: { flex: 1, position: 'relative' },
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
