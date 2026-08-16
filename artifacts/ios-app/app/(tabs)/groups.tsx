import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { Group } from '@workspace/api-client-react';

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onPress,
}: {
  group: Group;
  onPress: () => void;
}) {
  const colors = useColors();
  const initials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.groupCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[styles.groupAvatar, { backgroundColor: colors.secondary }]}
      >
        <Text style={[styles.groupAvatarText, { color: colors.primary }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.groupInfo}>
        <Text
          style={[styles.groupName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
          {group.members.length}{' '}
          {group.members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: groups = [], isLoading } = useListGroups({
    query: { enabled: !!user, queryKey: getListGroupsQueryKey() },
  });

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: (group) => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setGroupName('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/group/${group.id}`);
      },
    },
  });

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createGroup.mutateAsync({ data: { name: groupName.trim() } });
    } catch {
      Alert.alert('Error', 'Could not create group. Please try again.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
          paddingBottom: insets.bottom + 49 + 20,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Columba
        </Text>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>
          Your Groups
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
          Manage your collaboration spaces.
        </Text>
      </View>

      {/* Group list */}
      {groups.length === 0 && !isLoading ? (
        <View style={styles.empty}>
          <Feather name="users" size={36} color={colors.secondary} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No groups yet — create one below
          </Text>
        </View>
      ) : (
        <View style={styles.groupList}>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/group/${group.id}`);
              }}
            />
          ))}
        </View>
      )}

      {/* Create New Group */}
      <View
        style={[
          styles.actionCard,
          {
            backgroundColor: colors.secondary,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.actionCardHeader}>
          <Feather name="plus-circle" size={16} color={colors.primary} />
          <Text style={[styles.actionCardTitle, { color: colors.foreground }]}>
            Create New Group
          </Text>
        </View>
        <Text style={[styles.actionCardSubtitle, { color: colors.mutedForeground }]}>
          Start a new space for your team to collaborate and share notes.
        </Text>

        <TextInput
          style={[
            styles.actionInput,
            {
              color: colors.foreground,
              borderBottomColor: colors.border,
            },
          ]}
          placeholder="Group Name"
          placeholderTextColor={colors.mutedForeground}
          value={groupName}
          onChangeText={setGroupName}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <Pressable
          style={[
            styles.actionBtn,
            {
              backgroundColor: groupName.trim() ? colors.primary : colors.card,
              borderColor: colors.border,
              borderWidth: groupName.trim() ? 0 : 1,
            },
          ]}
          onPress={handleCreate}
          disabled={!groupName.trim() || createGroup.isPending}
        >
          {createGroup.isPending ? (
            <ActivityIndicator
              color={
                groupName.trim() ? colors.primaryForeground : colors.mutedForeground
              }
            />
          ) : (
            <Text
              style={[
                styles.actionBtnText,
                {
                  color: groupName.trim()
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              Create Group  →
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },

  header: { gap: 4 },
  headerTitle: { fontSize: 22, fontFamily: 'Manrope_700Bold', marginBottom: 6 },
  sectionHeading: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    fontStyle: 'italic',
  },
  sectionSubtitle: { fontSize: 13, fontFamily: 'Manrope_400Regular' },

  groupList: { gap: 10 },

  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupAvatarText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  groupMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyText: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center' },

  actionCard: { padding: 20, gap: 14 },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionCardTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  actionCardSubtitle: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 20 },

  actionInput: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  actionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
