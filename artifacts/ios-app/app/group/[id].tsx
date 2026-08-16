import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import {
  useGetGroup,
  useInviteToGroup,
  useRemoveGroupMember,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import type { GroupMember } from '@workspace/api-client-react';

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isMe,
  canRemove,
  onRemove,
  scheme,
}: {
  member: GroupMember;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
  scheme: 'light' | 'dark' | null | undefined;
}) {
  const colors = useColors();
  const initials = member.email.slice(0, 2).toUpperCase();

  return (
    <BlurView
      intensity={scheme === 'dark' ? 40 : 65}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={styles.memberCard}
    >
      <LinearGradient
        colors={['rgba(42,123,111,0.7)', 'rgba(26,79,72,0.7)']}
        style={styles.memberAvatar}
      >
        <Text style={styles.memberInitials}>{initials}</Text>
      </LinearGradient>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberEmail, { color: colors.foreground }]} numberOfLines={1}>
          {member.email}
          {isMe ? ' (you)' : ''}
        </Text>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor:
                member.role === 'admin' ? colors.primary + '22' : 'rgba(30,92,84,0.1)',
            },
          ]}
        >
          <Text
            style={[
              styles.roleText,
              {
                color:
                  member.role === 'admin' ? colors.primary : colors.mutedForeground,
              },
            ]}
          >
            {member.role}
          </Text>
        </View>
      </View>
      {canRemove && (
        <Pressable onPress={onRemove} hitSlop={14}>
          {Platform.OS === 'ios' ? (
            <SymbolView name="person.badge.minus" tintColor={colors.destructive} size={20} />
          ) : (
            <Feather name="user-minus" size={20} color={colors.destructive} />
          )}
        </Pressable>
      )}
    </BlurView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const colors = useColors();
  const scheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [inviteEmail, setInviteEmail] = useState('');

  const { data: group, isLoading } = useGetGroup(id ?? '');

  const inviteMutation = useInviteToGroup({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setInviteEmail('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          res.status === 'added' ? 'Added!' : 'Invite sent',
          res.message,
        );
      },
    },
  });

  const removeMutation = useRemoveGroupMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id ?? '') });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await inviteMutation.mutateAsync({
        id: id ?? '',
        data: { email: inviteEmail.trim().toLowerCase() },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not send invitation.';
      Alert.alert('Error', msg);
    }
  };

  const handleRemove = (member: GroupMember) => {
    const isMe = member.userId === user?.id;
    Alert.alert(
      isMe ? 'Leave group' : 'Remove member',
      isMe
        ? 'Are you sure you want to leave this group?'
        : `Remove ${member.email} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isMe ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await removeMutation.mutateAsync({ id: id ?? '', userId: member.userId });
            if (isMe) router.back();
          },
        },
      ],
    );
  };

  if (isLoading || !group) {
    return (
      <View style={styles.loadingRoot}>
        <LinearGradient
          colors={
            scheme === 'dark'
              ? [colors.gradientStart, colors.gradientEnd]
              : ['#D4F0E8', '#EBF7F3', '#F0F9F6']
          }
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const myMembership = group.members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'admin';

  const groupInitials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={
          scheme === 'dark'
            ? [colors.gradientStart, colors.gradientEnd]
            : ['#D4F0E8', '#EBF7F3', '#F0F9F6']
        }
        style={StyleSheet.absoluteFill}
      />

      <FlatList
        data={group.members}
        keyExtractor={(m) => m.userId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View>
            {/* Group avatar + name hero */}
            <LinearGradient
              colors={['#1A4F48', '#2A7B6F']}
              style={styles.groupHero}
            >
              <View style={styles.groupAvatarWrap}>
                <Text style={styles.groupAvatarText}>{groupInitials}</Text>
              </View>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.memberCount}>
                {group.members.length}{' '}
                {group.members.length === 1 ? 'member' : 'members'}
              </Text>
            </LinearGradient>

            {/* Invite card */}
            <BlurView
              intensity={scheme === 'dark' ? 40 : 65}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={styles.inviteCard}
            >
              <Text style={[styles.inviteLabel, { color: colors.foreground }]}>
                Invite someone
              </Text>
              <View style={styles.inviteRow}>
                <TextInput
                  style={[
                    styles.inviteInput,
                    {
                      backgroundColor: 'rgba(30,92,84,0.06)',
                      color: colors.foreground,
                      borderColor: 'rgba(30,92,84,0.15)',
                    },
                  ]}
                  placeholder="their@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleInvite}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.inviteBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleInvite}
                  disabled={inviteMutation.isPending || !inviteEmail.includes('@')}
                >
                  <LinearGradient
                    colors={
                      inviteEmail.includes('@')
                        ? ['#1A4F48', '#2A7B6F']
                        : ['rgba(30,92,84,0.2)', 'rgba(30,92,84,0.2)']
                    }
                    style={styles.inviteBtnGradient}
                  >
                    {inviteMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : Platform.OS === 'ios' ? (
                      <SymbolView
                        name="person.badge.plus"
                        tintColor={
                          inviteEmail.includes('@') ? '#FFFFFF' : colors.mutedForeground
                        }
                        size={18}
                      />
                    ) : (
                      <Feather
                        name="user-plus"
                        size={18}
                        color={
                          inviteEmail.includes('@') ? '#FFFFFF' : colors.mutedForeground
                        }
                      />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </BlurView>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Members
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            isMe={item.userId === user?.id}
            canRemove={isAdmin || item.userId === user?.id}
            onRemove={() => handleRemove(item)}
            scheme={scheme}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },

  groupHero: {
    alignItems: 'center',
    marginHorizontal: -16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  groupAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,166,35,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 4,
  },
  groupAvatarText: { fontSize: 30, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
  groupName: { fontSize: 24, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
  memberCount: { fontSize: 14, fontFamily: 'Manrope_400Regular', color: 'rgba(255,255,255,0.7)' },

  inviteCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.12)',
    padding: 16,
    gap: 12,
    marginBottom: 24,
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  inviteLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  inviteRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inviteInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
    borderRadius: 14,
  },
  inviteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inviteBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.1)',
    shadowColor: '#1E5C54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberInitials: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', color: '#FFFFFF' },
  memberInfo: { flex: 1, gap: 4 },
  memberEmail: { fontSize: 14, fontFamily: 'Manrope_500Medium' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
});
