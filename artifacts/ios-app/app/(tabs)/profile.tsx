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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const initials = (user?.email ?? '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
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
          'Enable notifications in Settings to receive reminders.',
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
    } catch (e) {
      Alert.alert('Error', 'Could not enable notifications. Please try again.');
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 80 },
        ]}
      >
        {/* Avatar + info */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.emailText, { color: colors.foreground }]}>
            {user?.email}
          </Text>
          {memberSince && (
            <Text style={[styles.sinceText, { color: colors.mutedForeground }]}>
              Member since {memberSince}
            </Text>
          )}
        </View>

        {/* Notifications section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Notifications
          </Text>
          <View style={styles.settingRow}>
            <Feather
              name="bell"
              size={20}
              color={notificationsEnabled ? colors.primary : colors.mutedForeground}
            />
            <View style={styles.settingLabel}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                Reminders
              </Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                Push alerts for overdue notes
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={notifLoading}
              trackColor={{ false: colors.muted, true: colors.primary + 'bb' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.mutedForeground}
            />
          </View>
        </View>

        {/* Account section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Account
          </Text>
          <Pressable
            style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={20} color={colors.destructive} />
            <Text style={[styles.settingTitle, { color: colors.destructive, flex: 1 }]}>
              Sign out
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Columba · v1.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 32, fontFamily: 'Manrope_700Bold' },

  content: { paddingHorizontal: 16, paddingTop: 28, gap: 16 },

  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontFamily: 'Manrope_700Bold' },
  emailText: { fontSize: 17, fontFamily: 'Manrope_600SemiBold', marginTop: 4 },
  sinceText: { fontSize: 13, fontFamily: 'Manrope_400Regular' },

  section: { borderWidth: 1, overflow: 'hidden' },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: { flex: 1 },
  settingTitle: { fontSize: 16, fontFamily: 'Manrope_500Medium' },
  settingDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  footer: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});
