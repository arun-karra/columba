import React, { useState, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useCreateNote,
  useListGroups,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function NewNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const bodyRef = useRef<TextInput>(null);

  const { data: groups = [] } = useListGroups();
  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
      },
    },
  });

  const currentGroup = groups.find((g) => g.id === groupId);
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
          groupId: groupId || null,
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
          onSubmitEditing={() => bodyRef.current?.focus()}
        />

        {/* Body */}
        <TextInput
          ref={bodyRef}
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

        {/* Urgent toggle */}
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

        {/* Group selector */}
        <Pressable
          style={styles.metaRow}
          onPress={() => setShowGroupPicker((p) => !p)}
        >
          <Feather
            name="users"
            size={18}
            color={groupId ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.metaLabel, { color: colors.foreground }]}>
            {currentGroup ? currentGroup.name : 'Personal'}
          </Text>
          <Feather
            name={showGroupPicker ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </Pressable>

        {showGroupPicker && (
          <View
            style={[
              styles.picker,
              { backgroundColor: colors.muted, borderRadius: colors.radius / 2 },
            ]}
          >
            <Pressable
              style={[
                styles.pickerRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: groups.length > 0 ? 1 : 0,
                },
              ]}
              onPress={() => {
                setGroupId(null);
                setShowGroupPicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerText,
                  {
                    color: !groupId ? colors.primary : colors.foreground,
                    fontFamily: !groupId ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                  },
                ]}
              >
                Personal
              </Text>
              {!groupId && <Feather name="check" size={16} color={colors.primary} />}
            </Pressable>
            {groups.map((g, i) => (
              <Pressable
                key={g.id}
                style={[
                  styles.pickerRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < groups.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={() => {
                  setGroupId(g.id);
                  setShowGroupPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerText,
                    {
                      color: groupId === g.id ? colors.primary : colors.foreground,
                      fontFamily:
                        groupId === g.id ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                    },
                  ]}
                >
                  {g.name}
                </Text>
                {groupId === g.id && (
                  <Feather name="check" size={16} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
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

  scroll: { padding: 20 },
  titleInput: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  bodyInput: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 26,
    minHeight: 160,
    marginBottom: 24,
  },
  divider: { height: 1, marginBottom: 10 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  metaLabel: { flex: 1, fontSize: 15, fontFamily: 'Manrope_500Medium' },

  picker: { marginBottom: 8, overflow: 'hidden' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pickerText: { fontSize: 15 },
});
