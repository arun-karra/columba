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
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const initials = (user?.email ?? '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : null;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Catch you later! 👋', [
      { text: 'Stay', style: 'cancel' },
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
      const Notifications = await import('expo-notifications').then((m) => m.default ?? m);
      const { status } = await (Notifications as any).requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications in Settings to get reminders.');
        setNotifLoading(false);
        return;
      }
      const tokenData = await (Notifications as any).getExpoPushTokenAsync();
      const { registerPushToken } = await import('@workspace/api-client-react');
      await registerPushToken({ expoPushToken: tokenData.data as string, platform: 'ios' });
      setNotificationsEnabled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not enable notifications. Please try again.');
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={scheme === 'dark'
          ? [colors.gradientStart, colors.gradientEnd]
          : ['#D4F0E8', '#EBF7F3', '#F0F9F6']}
        style={StyleSheet.absoluteFill}
      />

      {/* Avatar header section */}
      <LinearGradient
        colors={['#1A4F48', '#1E5C54']}
        style={[styles.avatarBg, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20) }]}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        {memberSince && (
          <Text style={styles.avatarSince}>Member since {memberSince} 🌿</Text>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) + 90 },
        ]}
      >
        {/* Notifications card */}
        <BlurView
          intensity={scheme === 'dark' ? 40 : 65}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.card}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            🔔  Notifications
          </Text>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: 'rgba(30,92,84,0.08)' }]}>
            <View style={styles.rowLabel}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Reminders</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>
                Push alerts for upcoming notes
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={notifLoading}
              trackColor={{ false: 'rgba(30,92,84,0.15)', true: colors.primary + 'cc' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </BlurView>

        {/* Account card */}
        <BlurView
          intensity={scheme === 'dark' ? 40 : 65}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.card}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            👤  Account
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              {
                borderTopWidth: 1,
                borderTopColor: 'rgba(30,92,84,0.08)',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={20} color={colors.destructive} />
            <Text style={[styles.rowTitle, { color: colors.destructive, flex: 1 }]}>
              Sign out
            </Text>
            <Feather name="chevron-right" size={16} color={colors.destructive + '80'} />
          </Pressable>
        </BlurView>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Columba · v1.0  🍃
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  avatarBg: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
  avatarText: { fontSize: 32, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
  avatarEmail: { fontSize: 16, fontFamily: 'Manrope_600SemiBold', color: 'rgba(255,255,255,0.95)' },
  avatarSince: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: 'rgba(255,255,255,0.65)' },

  content: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  card: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30,92,84,0.1)',
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowLabel: { flex: 1 },
  rowTitle: { fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  rowDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  footer: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});
