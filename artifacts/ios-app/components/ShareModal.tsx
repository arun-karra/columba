import React, { useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from '@workspace/api-client-react';
import { useColors, groupAvatarColor } from '@/hooks/useColors';

// ── Types ────────────────────────────────────────────────────────────────────

interface ShareModalProps {
  visible: boolean;
  /** currently selected groupId (for highlighting) */
  selectedGroupId?: string | null;
  onClose: () => void;
  /** called with the chosen groupId and its name */
  onSelect: (groupId: string, groupName?: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ShareModal({ visible, selectedGroupId, onClose, onSelect }: ShareModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const { data: groups = [], isLoading } = useListGroups();
  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: (group) => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
        setNewGroupName('');
        onSelect(group.id, group.name);
      },
    },
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    Keyboard.dismiss();
    try {
      await createGroup.mutateAsync({ data: { name: newGroupName.trim() } });
    } catch {
      Alert.alert('Error', 'Could not create group. Try again.');
    }
  };

  const handleReset = () => {
    setShowCreate(false);
    setNewGroupName('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        handleReset();
        onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                paddingTop: Platform.OS === 'android' ? insets.top + 12 : 20,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Pressable onPress={() => { handleReset(); onClose(); }} hitSlop={14}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Share with a group
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
            {/* Hint */}
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Pick a group to share this note with all its members.
            </Text>

            {/* Group list */}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : groups.length === 0 && !showCreate ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={32} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  You're not in any groups yet.
                </Text>
              </View>
            ) : (
              <View style={styles.groupList}>
                {groups.map((g, i) => {
                  const isSelected = g.id === selectedGroupId;
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
                        {
                          backgroundColor: isSelected
                            ? colors.primary + '15'
                            : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderRadius: colors.radius,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={() => onSelect(g.id, g.name)}
                    >
                      <View
                        style={[styles.groupAvatar, { backgroundColor: groupAvatarColor(colors, i) }]}
                      >
                        <Text
                          style={[
                            styles.groupAvatarText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          {initials}
                        </Text>
                      </View>
                      <View style={styles.groupInfo}>
                        <Text style={[styles.groupName, { color: colors.foreground }]}>
                          {g.name}
                        </Text>
                        <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
                          {g.members.length}{' '}
                          {g.members.length === 1 ? 'member' : 'members'}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Create new group */}
            {showCreate ? (
              <View
                style={[
                  styles.createCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.createLabel, { color: colors.foreground }]}>
                  New group name
                </Text>
                <TextInput
                  style={[
                    styles.createInput,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: colors.radius / 2,
                    },
                  ]}
                  placeholder="e.g. Family, Work, Flatmates…"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateGroup}
                />
                <View style={styles.createActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelBtn,
                      {
                        borderColor: colors.border,
                        borderRadius: colors.radius / 2,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => setShowCreate(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      {
                        backgroundColor: newGroupName.trim()
                          ? colors.primary
                          : colors.muted,
                        borderRadius: colors.radius / 2,
                        opacity: pressed ? 0.8 : 1,
                        flex: 1,
                      },
                    ]}
                    onPress={handleCreateGroup}
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
                        Create &amp; share
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.newGroupBtn,
                  {
                    borderColor: colors.primary,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => setShowCreate(true)}
              >
                <Feather name="plus-circle" size={18} color={colors.primary} />
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

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },

  body: { flex: 1, padding: 20, gap: 16 },

  hint: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },

  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 15, fontFamily: 'Manrope_400Regular', textAlign: 'center' },

  groupList: { gap: 10 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupAvatarText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  groupMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  newGroupBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  createCard: { padding: 16, borderWidth: 1, gap: 12 },
  createLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  createInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
  },
  createActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  confirmBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
});
