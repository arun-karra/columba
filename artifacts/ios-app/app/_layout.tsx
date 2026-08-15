import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setBaseUrl,
  setAuthTokenGetter,
  getListNotesQueryKey,
  getGetNotesSummaryQueryKey,
} from '@workspace/api-client-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import {
  PINNED_NOTE_CATEGORY,
  MARK_COMPLETE_ACTION,
  dismissNoteNotification,
} from '@/utils/notifications';

// ── Module-level API + notification configuration ───────────────────────────
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
setAuthTokenGetter(() => AsyncStorage.getItem('columba-token'));

// Show alert + sound for notifications received while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// ── Auth redirect guard ─────────────────────────────────────────────────────

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'auth';

    if (!user && !inAuth) {
      router.replace('/auth');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  return null;
}

// ── Navigation ──────────────────────────────────────────────────────────────

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="note/new"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: 'card',
            headerBackTitle: 'Notes',
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="group/[id]"
          options={{
            presentation: 'card',
            headerBackTitle: 'Groups',
            headerTitle: 'Group',
          }}
        />
      </Stack>
    </>
  );
}

// ── Root layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // ── Notification category + action listener ──────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // Register the PINNED_NOTE category so iOS shows the "Mark as Complete"
    // button when the user long-presses a pinned-note notification.
    void Notifications.setNotificationCategoryAsync(PINNED_NOTE_CATEGORY, [
      {
        identifier: MARK_COMPLETE_ACTION,
        buttonTitle: 'Mark as Complete',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    // Foreground: handle dismiss signals sent by the server when a note is
    // marked done or unpinned from another device / from within the app.
    const foregroundSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        if (data?.dismiss && typeof data?.noteId === 'string') {
          void dismissNoteNotification(data.noteId);
        }
      },
    );

    // ── Shared handler for "Mark as Complete" action ─────────────────────────
    // Called for both active/background responses (listener) AND the initial
    // response when the app is launched from a terminated state (getLastNotificationResponseAsync).
    async function handleMarkCompleteResponse(
      response: Notifications.NotificationResponse,
    ) {
      const { actionIdentifier, notification } = response;
      if (actionIdentifier !== MARK_COMPLETE_ACTION) return;

      const data = notification.request.content.data as Record<string, unknown>;
      const noteId = typeof data?.noteId === 'string' ? data.noteId : undefined;
      if (!noteId) return;

      try {
        const token = await AsyncStorage.getItem('columba-token');
        const res = await fetch(
          `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/notes/${noteId}/mark-done`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotesSummaryQueryKey() });
      } catch {
        // best-effort — network may be unavailable on lock screen
      }
    }

    // Cold-start: app was terminated when the user tapped the action button.
    // The listener below won't fire in this case; retrieve the stored response instead.
    // Clear immediately after reading so subsequent launches don't re-process it.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void Notifications.clearLastNotificationResponseAsync();
        void handleMarkCompleteResponse(response);
      }
    });

    // Background / lock-screen: user tapped "Mark as Complete" while the app
    // was backgrounded or foregrounded.
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => { void handleMarkCompleteResponse(response); },
    );

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
