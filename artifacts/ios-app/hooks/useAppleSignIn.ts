import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { useDevBypassAuth, useSignInWithApple } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { markOnboardingSlidesSeen } from '@/utils/onboardingStorage';

const LOGO_TAP_TARGET = 20;
const TAP_RESET_MS = 2_000;
export const devBypassEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_BYPASS === 'true';

export function useAppleSignIn() {
  const { signIn } = useAuth();
  const signInWithApple = useSignInWithApple();
  const devBypass = useDevBypassAuth();

  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const logoTapCount = useRef(0);
  const lastLogoTapAt = useRef(0);

  const completeSignIn = useCallback(
    async (token: string, user: Parameters<typeof signIn>[1]) => {
      await markOnboardingSlidesSeen();
      await signIn(token, user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    },
    [signIn],
  );

  const handleAppleSignIn = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Sign in failed', 'Apple did not return an identity token.');
        return;
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const res = await signInWithApple.mutateAsync({
        data: {
          identityToken: credential.identityToken,
          email: credential.email ?? undefined,
          fullName: fullName || undefined,
        },
      });
      await completeSignIn(res.token, res.user);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      const msg =
        err instanceof Error ? err.message : 'Apple sign-in failed. Please try again.';
      Alert.alert('Sign in failed', msg);
    }
  }, [completeSignIn, signInWithApple]);

  const handleDevBypass = useCallback(async () => {
    if (!bypassCode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await devBypass.mutateAsync({ data: { code: bypassCode.trim() } });
      setShowBypassModal(false);
      setBypassCode('');
      await completeSignIn(res.token, res.user);
    } catch {
      Alert.alert('Wrong code', 'That bypass code did not work.');
      setBypassCode('');
    }
  }, [bypassCode, completeSignIn, devBypass]);

  const handleDevBypassTap = useCallback(() => {
    if (!devBypassEnabled) return;

    const now = Date.now();
    if (now - lastLogoTapAt.current > TAP_RESET_MS) {
      logoTapCount.current = 0;
    }
    lastLogoTapAt.current = now;
    logoTapCount.current += 1;

    if (logoTapCount.current >= LOGO_TAP_TARGET) {
      logoTapCount.current = 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowBypassModal(true);
    }
  }, []);

  const appleBusy = signInWithApple.isPending || devBypass.isPending;
  const appleAvailable = Platform.OS === 'ios';

  return {
    appleBusy,
    appleAvailable,
    showBypassModal,
    setShowBypassModal,
    bypassCode,
    setBypassCode,
    handleAppleSignIn,
    handleDevBypass,
    handleDevBypassTap,
  };
}
