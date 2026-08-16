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
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

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
  const scheme = useColorScheme();
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

  const blurIntensity = scheme === 'dark' ? 40 : 65;
  const blurTint = scheme === 'dark' ? ('dark' as const) : ('light' as const);

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
        <View style={styles.root}>
          {/* Background gradient */}
          <LinearGradient
            colors={
              scheme === 'dark'
                ? [colors.background, colors.muted]
                : ['#D4F0E8', '#EBF7F3', '#F0F9F6']
            }
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={[
              styles.header,
              {
                paddingTop: Platform.OS === 'android' ? insets.top + 12 : 20,
                borderBottomColor: 'rgba(30,92,84,0.12)',
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
          </BlurView>

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
                <Feather name="users" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  You're not in any groups yet.
                </Text>
              </View>
            ) : (
              <View style={styles.groupList}>
                {groups.map((g) => {
                  const isSelected = g.id === selectedGroupId;
                  const initials = g.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? '')
                    .join('');
                  return (
                    <Pressable
                      key={g.id}
                      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
                      onPress={() => onSelect(g.id, g.name)}
                    >
                      <BlurView
                        intensity={blurIntensity}
                        tint={blurTint}
                        style={[
                          styles.groupRow,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : 'rgba(30,92,84,0.12)',
                          },
                        ]}
                      >
                        {isSelected && (
                          <LinearGradient
                            colors={[colors.primary + '18', colors.primary + '08']}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <LinearGradient
                          colors={['#1A4F48', '#2A7B6F']}
                          style={styles.groupAvatar}
                        >
                          <Text style={styles.groupAvatarText}>{initials}</Text>
                        </LinearGradient>
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
                      </BlurView>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Create new group */}
            {showCreate ? (
              <BlurView
                intensity={blurIntensity}
                tint={blurTint}
                style={styles.createCard}
              >
                <Text style={[styles.createLabel, { color: colors.foreground }]}>
                  New group name
                </Text>
                <TextInput
                  style={[
                    styles.createInput,
                    {
                      backgroundColor: 'rgba(30,92,84,0.06)',
                      color: colors.foreground,
                      borderColor: 'rgba(30,92,84,0.15)',
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
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => setShowCreate(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmBtnWrap,
                      { opacity: pressed ? 0.85 : 1, flex: 1 },
                    ]}
                    onPress={handleCreateGroup}
                    disabled={createGroup.isPending || !newGroupName.trim()}
                  >
                    <LinearGradient
                      colors={
                        newGroupName.trim()
                          ? ['#1A4F48', '#2A7B6F']
                          : ['rgba(30,92,84,0.2)', 'rgba(30,92,84,0.2)']
                      }
                      style={styles.confirmBtnGradient}
                    >
                      {createGroup.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.confirmBtnText,
                            {
                              color: newGroupName.trim()
                                ? '#FFFFFF'
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          Create &amp; share
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </BlurView>
            ) : (
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                onPress={() => setShowCreate(true)}
              >
                <BlurView
                  intensity={blurIntensity}
                  tint={blurTint}
                  style={styles.newGroupBtn}
                >
                  <Feather name="plus-circle" size={18} color={colors.primary} />
                  <Text style={[styles.newGroupBtnText, { color: colors.primary }]}>
                    Create a new group
                  </Text>
                </BlurView>
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
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupAvatarText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  groupMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(30,92,84,0.25)',
  },
  newGroupBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  createCard: {
    padding: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.12)',
    gap: 12,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  createLabel: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  createInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
    borderRadius: 12,
  },
  createActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,92,84,0.08)',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  confirmBtnWrap: { borderRadius: 12, overflow: 'hidden' },
  confirmBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
});
