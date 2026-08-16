import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

// ─── Section ─────────────────────────────────────────────────────────────────

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
        <Feather
          name={
            title === 'General'
              ? 'sliders'
              : title === 'Notifications'
              ? 'bell'
              : 'refresh-cw'
          }
          size={15}
          color={colors.primary}
        />
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

// ─── Setting Row ─────────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  subtitle,
  chevron,
  right,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
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
        <Feather name={icon} size={14} color={colors.primary} />
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
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailDigests, setEmailDigests] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);

  const displayName = user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          queryClient.clear();
          await signOut();
        },
      },
    ]);
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
      const { status } = await (Notifications as any).requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Enable notifications in Settings to get reminders.',
        );
        setNotifLoading(false);
        return;
      }
      const tokenData = await (Notifications as any).getExpoPushTokenAsync();
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
            backgroundColor: colors.background,
          },
        ]}
      >
        <Feather name="send" size={16} color={colors.primary} />
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
          Columba
        </Text>
        <View
          style={[styles.topBarAvatar, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.topBarAvatarText, { color: colors.primary }]}>
            {initials}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 90,
          },
        ]}
      >
        {/* Avatar & info */}
        <View style={styles.hero}>
          <View
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>
            {displayName}
          </Text>
          <Text style={[styles.heroEmail, { color: colors.mutedForeground }]}>
            {user?.email}
          </Text>
          <View
            style={[styles.badge, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              PRO MEMBER
            </Text>
          </View>
        </View>

        {/* General */}
        <Section title="General">
          <SettingRow
            icon="user"
            label="Account Details"
            subtitle="Update your personal information"
            chevron
            onPress={() =>
              Alert.alert('Coming soon', 'Account settings are on their way.')
            }
          />
          <SettingRow
            icon="globe"
            label="Language & Region"
            subtitle="English (US)"
            chevron
            last
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon="mail"
            label="Email Digests"
            subtitle="Weekly summaries of your activity"
            right={
              <Switch
                value={emailDigests}
                onValueChange={setEmailDigests}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.border}
              />
            }
          />
          <SettingRow
            icon="smartphone"
            label="Push Notifications"
            subtitle="Immediate alerts for mentions"
            last
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
        </Section>

        {/* Data & Sync */}
        <Section title="Data & Sync">
          <SettingRow
            icon="database"
            label="Storage Usage"
            subtitle="Synced across your devices"
            last
            right={
              <View style={styles.storageWrap}>
                <View
                  style={[
                    styles.storageBar,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <View
                    style={[
                      styles.storageFill,
                      { backgroundColor: colors.primary, width: '28%' },
                    ]}
                  />
                </View>
              </View>
            }
          />
        </Section>

        {/* Sign out */}
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
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topBarTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', flex: 1 },
  topBarAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAvatarText: { fontSize: 11, fontFamily: 'Manrope_700Bold' },

  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },

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
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.8 },

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

  storageWrap: { width: 80 },
  storageBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: { height: '100%', borderRadius: 3 },

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
