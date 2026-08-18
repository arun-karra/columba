import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, useUpdateMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/AppIcon';
import { ScreenGradient } from '@/components/ScreenGradient';
import { confirmDestructive } from '@/utils/iosConfirm';
import { getDisplayInitials } from '@/utils/displayInitials';
import { useScreenGutter } from '@/constants/layout';
import type { SFSymbol } from 'expo-symbols';

function sectionIcon(title: string): SFSymbol {
  if (title === 'Account') return 'person.circle';
  if (title === 'Notifications') return 'bell';
  if (title === 'General') return 'gearshape';
  return 'arrow.clockwise';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <AppIcon name={sectionIcon(title)} size={15} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
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

function SettingRow({
  icon,
  label,
  subtitle,
  chevron,
  right,
  onPress,
  last,
}: {
  icon: SFSymbol;
  label: string;
  subtitle?: string;
  chevron?: boolean;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        pressed && onPress && { opacity: 0.7 },
      ]}
      onPress={onPress}
      disabled={!onPress && !chevron}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
        <AppIcon name={icon} size={14} color={colors.primary} />
      </View>
      <View style={styles.rowLabel}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? null}
      {chevron ? (
        <AppIcon name="chevron.right" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const { user, signOut, updateUser } = useAuth();
  const queryClient = useQueryClient();

  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const { data: profile } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), enabled: !!user },
  });

  const updateMe = useUpdateMe({
    mutation: {
      onSuccess: async (updated) => {
        await updateUser(updated);
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  useEffect(() => {
    if (isEditingName) return;
    const name = profile?.displayName ?? user?.displayName ?? '';
    setDisplayNameDraft(name);
  }, [profile?.displayName, user?.displayName, isEditingName]);

  const savedDisplayName =
    profile?.displayName?.trim() || user?.displayName?.trim() || '';
  const defaultName = user?.email?.split('@')[0] ?? 'User';
  const resolvedName = savedDisplayName || defaultName;
  const usingDefaultName = !savedDisplayName;

  const syncNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = await import('expo-notifications').then(
        (m) => m.default ?? m,
      );
      const { status } = await (Notifications as typeof import('expo-notifications')).getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch {
      setNotificationsEnabled(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void syncNotificationPermission();
    }, [syncNotificationPermission]),
  );

  const initials = getDisplayInitials(resolvedName);
  const email = profile?.email ?? user?.email ?? 'Signed in with Apple';

  const startEditingName = () => {
    Haptics.selectionAsync();
    setDisplayNameDraft(savedDisplayName || defaultName);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setDisplayNameDraft(savedDisplayName);
    setIsEditingName(false);
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayNameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    if (trimmed === savedDisplayName) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateMe.mutateAsync({ data: { displayName: trimmed } });
      setIsEditingName(false);
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 0;
      const apiMessage =
        error instanceof Error && error.message ? error.message : 'Could not save your name.';
      const hint =
        status === 500 || status === 503
          ? '\n\nYour database may be out of date. Stop the terminal (Ctrl+C), run pnpm mac:dev again — it now syncs the schema automatically.'
          : status === 404
            ? '\n\nRestart pnpm mac:dev so the API rebuilds with the latest /me route.'
            : '';
      Alert.alert('Error', `${apiMessage}${hint}`);
    }
  };

  const handleSignOut = () => {
    confirmDestructive({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        queryClient.clear();
        await signOut();
      },
    });
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (Platform.OS === 'web') {
      setNotificationsEnabled(value);
      return;
    }
    if (!value) {
      setNotificationsEnabled(false);
      return;
    }
    setNotifLoading(true);
    try {
      const Notifications = await import('expo-notifications').then(
        (m) => m.default ?? m,
      );
      const { status } = await (Notifications as typeof import('expo-notifications')).requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Enable notifications in Settings to get reminders.',
        );
        setNotificationsEnabled(false);
        setNotifLoading(false);
        return;
      }
      const tokenData = await (Notifications as typeof import('expo-notifications')).getExpoPushTokenAsync();
      const { registerPushToken } = await import('@workspace/api-client-react');
      await registerPushToken({
        expoPushToken: tokenData.data as string,
        platform: 'ios',
      });
      setNotificationsEnabled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not enable notifications. Please try again.');
    } finally {
      setNotifLoading(false);
    }
  };

  const openSystemSettings = () => {
    Haptics.selectionAsync();
    void Linking.openSettings();
  };

  return (
    <ScreenGradient>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: gutter,
          },
        ]}
      >
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: gutter,
            paddingBottom: 32,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>
            {resolvedName}
          </Text>
          <Text style={[styles.heroEmail, { color: colors.mutedForeground }]}>
            {email}
          </Text>
        </View>

        <Section title="Account">
          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Display name
              </Text>
              {!isEditingName ? (
                <Pressable onPress={startEditingName} hitSlop={8}>
                  <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
            {isEditingName ? (
              <>
                <TextInput
                  style={[
                    styles.fieldInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={displayNameDraft}
                  onChangeText={setDisplayNameDraft}
                  placeholder="Your name"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSaveDisplayName()}
                  maxLength={100}
                />
                <View style={styles.editActions}>
                  <Pressable onPress={cancelEditingName} hitSlop={8}>
                    <Text style={[styles.editActionText, { color: colors.mutedForeground }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleSaveDisplayName()}
                    hitSlop={8}
                    disabled={updateMe.isPending}
                  >
                    <Text style={[styles.editActionText, { color: colors.primary }]}>
                      {updateMe.isPending ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                  {resolvedName}
                </Text>
                {usingDefaultName ? (
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                    Using your email name — tap Edit to customize
                  </Text>
                ) : null}
              </>
            )}
          </View>
          <View style={[styles.fieldBlock, styles.fieldBlockLast]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Email
            </Text>
            <Text style={[styles.fieldValue, { color: colors.foreground }]}>
              {email}
            </Text>
          </View>
        </Section>

        <Section title="Notifications">
          <SettingRow
            icon="iphone"
            label="Push Notifications"
            subtitle={
              notificationsEnabled
                ? 'Reminders and pinned note alerts'
                : 'Off — manage in iPhone Settings'
            }
            last={notificationsEnabled}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                disabled={notifLoading}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.border}
              />
            }
          />
          {!notificationsEnabled && Platform.OS !== 'web' ? (
            <Pressable
              style={({ pressed }) => [
                styles.settingsLinkRow,
                { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={openSystemSettings}
            >
              <AppIcon name="gearshape" size={16} color={colors.primary} />
              <Text style={[styles.settingsLinkText, { color: colors.primary }]}>
                Open iPhone Settings
              </Text>
              <AppIcon name="arrow.up.forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </Section>

        <Pressable
          style={[
            styles.signOutBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={handleSignOut}
        >
          <AppIcon name="rectangle.portrait.and.arrow.right" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingBottom: 8,
  },
  topBarTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },

  content: { paddingTop: 8, gap: 20 },

  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontFamily: 'Manrope_700Bold' },
  heroName: { fontSize: 20, fontFamily: 'Manrope_700Bold' },
  heroEmail: { fontSize: 14, fontFamily: 'Manrope_400Regular' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },

  sectionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  fieldBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    gap: 8,
  },
  fieldBlockLast: {
    borderBottomWidth: 0,
  },
  fieldLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editLink: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  fieldHint: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 4,
  },
  editActionText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  fieldInput: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  fieldValue: { fontSize: 16, fontFamily: 'Manrope_500Medium' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  rowSubtitle: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  settingsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingsLinkText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  signOutText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
