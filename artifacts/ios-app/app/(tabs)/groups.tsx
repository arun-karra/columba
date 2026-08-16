import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const colors = useColors();
  const scheme = useColorScheme();
  const initials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
      onPress={onPress}
    >
      <BlurView
        intensity={scheme === 'dark' ? 40 : 65}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={styles.card}
      >
        <LinearGradient
          colors={['#1A4F48', '#2A7B6F']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View style={styles.cardContent}>
          <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {group.members.length}{' '}
            {group.members.length === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </BlurView>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const colors = useColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: groups = [], isLoading } = useListGroups({
    query: { queryKey: getListGroupsQueryKey(), enabled: !!user },
  });

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: (group) => {
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setShowCreate(false);
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

  const fabBottom = insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 72;

  return (
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
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Groups</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No groups yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Create a group to share notes with family or friends
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: fabBottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/group/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* FAB */}
      <View style={[styles.fabWrap, { bottom: fabBottom }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreate(true);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <LinearGradient
            colors={['#F5A623', '#FF6B5B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Feather name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Create group sheet */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setShowCreate(false);
            setGroupName('');
          }}
        >
          <Pressable style={[styles.sheetWrap, { paddingBottom: insets.bottom + 8 }]}>
            <BlurView
              intensity={scheme === 'dark' ? 60 : 80}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={styles.sheet}
            >
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                New Group
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: 'rgba(30,92,84,0.06)',
                    color: colors.foreground,
                    borderColor: 'rgba(30,92,84,0.15)',
                  },
                ]}
                placeholder="e.g. Household, Book Club…"
                placeholderTextColor={colors.mutedForeground}
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <View style={styles.sheetActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetBtn,
                    styles.sheetBtnCancel,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => {
                    setShowCreate(false);
                    setGroupName('');
                  }}
                >
                  <Text style={[styles.sheetBtnText, { color: colors.mutedForeground }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetBtn,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={handleCreate}
                  disabled={createGroup.isPending || !groupName.trim()}
                >
                  <LinearGradient
                    colors={
                      groupName.trim()
                        ? ['#1A4F48', '#2A7B6F']
                        : ['rgba(30,92,84,0.2)', 'rgba(30,92,84,0.2)']
                    }
                    style={styles.sheetBtnGradient}
                  >
                    {createGroup.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text
                        style={[
                          styles.sheetBtnText,
                          {
                            color: groupName.trim() ? '#FFFFFF' : colors.mutedForeground,
                          },
                        ]}
                      >
                        Create
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 14 },
  headerTitle: { fontSize: 36, fontFamily: 'Manrope_700Bold', letterSpacing: -0.5 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope_600SemiBold', marginTop: 6 },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.12)',
    gap: 12,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
  cardContent: { flex: 1 },
  groupName: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  memberCount: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheetWrap: { borderRadius: 28, overflow: 'hidden' },
  sheet: { padding: 24, gap: 16 },
  sheetTitle: { fontSize: 20, fontFamily: 'Manrope_700Bold' },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
    borderRadius: 14,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1, height: 50, borderRadius: 14, overflow: 'hidden' },
  sheetBtnCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,92,84,0.08)',
  },
  sheetBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
