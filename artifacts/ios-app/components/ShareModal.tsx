import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { EmojiPicker } from '@/components/EmojiPicker';
import { GroupAvatar } from '@/components/GroupAvatar';
import { useScreenGutter } from '@/constants/layout';
import {
  defaultEmojiForGroup,
  getGroupEmojiMap,
  resolveGroupEmoji,
  setGroupEmoji,
} from '@/utils/groupEmoji';

interface ShareModalProps {
  visible: boolean;
  selectedGroupId?: string | null;
  onClose: () => void;
  onSelect: (groupId: string, groupName?: string) => void;
}

export function ShareModal({ visible, selectedGroupId, onClose, onSelect }: ShareModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState<string>(defaultEmojiForGroup(''));
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});

  const { data: groups = [], isLoading } = useListGroups();

  useEffect(() => {
    if (!visible) return;
    void getGroupEmojiMap().then(setEmojiMap);
  }, [visible, groups.length]);

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: async (group) => {
        await setGroupEmoji(group.id, newGroupEmoji);
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
        setNewGroupName('');
        setNewGroupEmoji(defaultEmojiForGroup(''));
        onSelect(group.id, group.name);
      },
    },
  });

  const handleCreateGroup = async () => {
    const value = newGroupName.trim();
    if (!value) return;
    Keyboard.dismiss();
    try {
      await createGroup.mutateAsync({ data: { name: value } });
    } catch {
      Alert.alert('Error', 'Could not create group. Try again.');
    }
  };

  const handleReset = () => {
    setShowCreate(false);
    setNewGroupName('');
    setNewGroupEmoji(defaultEmojiForGroup(''));
  };

  const pickGroup = (groupId: string, groupName: string) => {
    onSelect(groupId, groupName);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={() => {
        handleReset();
        onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.header,
              {
                paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12,
                paddingHorizontal: gutter,
                borderBottomColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                handleReset();
                onClose();
              }}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.headerAction, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Share with a group
            </Text>
            <View style={{ width: 64 }} />
          </View>

          <View
            style={[
              styles.body,
              { paddingHorizontal: gutter, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Tap a group — sharing saves automatically.
            </Text>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : groups.length === 0 && !showCreate ? (
              <View style={styles.emptyState}>
                <AppIcon name="person.2" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  You're not in any groups yet.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.groupList,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {groups.map((g, index) => {
                  const isSelected = g.id === selectedGroupId;
                  const emoji = resolveGroupEmoji(g.id, g.name, emojiMap);
                  const initials = g.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('');
                  return (
                    <Pressable
                      key={g.id}
                      style={({ pressed }) => [
                        styles.groupRow,
                        index < groups.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => pickGroup(g.id, g.name)}
                    >
                      <GroupAvatar emoji={emoji} fallbackInitials={initials} size={40} />
                      <View style={styles.groupInfo}>
                        <Text style={[styles.groupName, { color: colors.foreground }]}>
                          {g.name}
                        </Text>
                        <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
                          {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
                        </Text>
                      </View>
                      {isSelected ? (
                        <AppIcon name="checkmark.circle.fill" size={22} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {showCreate ? (
              <View
                style={[
                  styles.createCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.createLabel, { color: colors.foreground }]}>
                  New group
                </Text>
                <EmojiPicker value={newGroupEmoji} onChange={setNewGroupEmoji} />
                <TextInput
                  style={[
                    styles.createInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="e.g. Family, Work, Flatmates…"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void handleCreateGroup()}
                />
                <View style={styles.createActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.confirmBtn,
                      {
                        backgroundColor: newGroupName.trim()
                          ? colors.primary
                          : colors.secondary,
                      },
                    ]}
                    onPress={() => void handleCreateGroup()}
                    disabled={createGroup.isPending || !newGroupName.trim()}
                  >
                    {createGroup.isPending ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text
                        style={[
                          styles.confirmBtnText,
                          {
                            color: newGroupName.trim()
                              ? colors.primaryForeground
                              : colors.mutedForeground,
                          },
                        ]}
                      >
                        Create & share
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.newGroupBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  setNewGroupEmoji(defaultEmojiForGroup(''));
                  setShowCreate(true);
                }}
              >
                <AppIcon name="plus" size={18} color={colors.primary} />
                <Text style={[styles.newGroupBtnText, { color: colors.primary }]}>
                  Create a new group
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { fontSize: 17, width: 64 },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  body: { flex: 1, paddingTop: 20, gap: 16 },
  hint: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 15, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  groupList: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  groupMeta: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  newGroupBtnText: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  createCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  createLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  createInput: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  createActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 17, fontFamily: 'Manrope_600SemiBold' },
});
