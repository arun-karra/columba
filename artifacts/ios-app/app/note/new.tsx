import React, { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { NoteBodyInput } from '@/components/NoteBodyInput';
import { useNoteDictation } from '@/hooks/useNoteDictation';
import {
  NotifySection,
  defaultNotifyValue,
  notifyPayload,
  type NotifyValue,
} from '@/components/NotifySection';
import { presentPinnedNoteNotification } from '@/utils/pinnedNoteNotification';
import { ensureLocalNotificationPermission } from '@/utils/notificationPermissions';
import { useScreenGutter } from '@/constants/layout';

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

export default function NewNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [notify, setNotify] = useState<NotifyValue>(defaultNotifyValue);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { dictationState, isDictationSupported, toggleDictation } = useNoteDictation({
    body,
    onBodyChange: setBody,
  });

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

    const payload = notifyPayload(notify);
    if (payload.isPinned && !payload.remindAt) {
      const granted = await ensureLocalNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications needed',
          'Allow notifications in Settings to show notes on your lock screen.',
        );
        return;
      }
    }

    try {
      const created = await createNote.mutateAsync({
        data: {
          title: null,
          body: body.trim(),
          isPinned: payload.isPinned,
          groupId: groupId || null,
          remindAt: payload.remindAt,
        },
      });
      if (payload.isPinned && !payload.remindAt) {
        await presentPinnedNoteNotification({
          id: created.id,
          body: body.trim(),
          groupId: created.groupId,
          groupName: created.groupName,
          groupEmoji: created.groupEmoji,
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
              Save
            </Text>
          )}
        </Pressable>
      ),
    });
  }, [canSave, createNote.isPending, body, notify, groupId]);

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
        <NoteBodyInput
          placeholder="Write a note..."
          value={body}
          onChangeText={setBody}
          autoFocus
          dictationState={dictationState}
          isDictationSupported={isDictationSupported}
          onToggleDictation={() => {
            void toggleDictation();
          }}
        />

        <NotifySection
          value={notify}
          onChange={setNotify}
          showDatePicker={showDatePicker}
          onShowDatePicker={setShowDatePicker}
        />

        <SectionCard title="Select Group">
          <View style={styles.groupPickerWrap}>
            <ShareGroupPicker
              showTitle={false}
              allowCreate={false}
              selectedGroupId={groupId}
              onSelect={(id) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setGroupId(id);
              }}
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
});
