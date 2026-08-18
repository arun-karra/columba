import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { useDevBypassAuth, useSignInWithApple } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { ScreenGradient } from '@/components/ScreenGradient';
import { useScreenGutter } from '@/constants/layout';

const appIcon = require('@/assets/images/icon.png');

const LOGO_TAP_TARGET = 20;
const TAP_RESET_MS = 2_000;
const devBypassEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_BYPASS === 'true';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const { signIn } = useAuth();

  const signInWithApple = useSignInWithApple();
  const devBypass = useDevBypassAuth();

  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const logoTapCount = useRef(0);
  const lastLogoTapAt = useRef(0);

  const completeSignIn = useCallback(
    async (token: string, user: Parameters<typeof signIn>[1]) => {
      await signIn(token, user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    },
    [signIn],
  );

  const handleAppleSignIn = async () => {
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
  };

  const handleLogoPress = () => {
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
  };

  const handleDevBypass = async () => {
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
  };

  const appleBusy = signInWithApple.isPending || devBypass.isPending;

  return (
    <ScreenGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: gutter,
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Pressable onPress={handleLogoPress} style={styles.logoWrap}>
              <Image source={appIcon} style={styles.logoImage} contentFit="contain" />
              <Text style={[styles.logoLabel, { color: colors.primary }]}>COLUMBA</Text>
            </Pressable>

            <Text style={[styles.appName, { color: colors.foreground }]}>Columba</Text>

            <Text style={[styles.heading, { color: colors.foreground }]}>
              Welcome to Columba
            </Text>
            <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
              Sign in with Apple to sync your notes across devices. No passwords, no email codes.
            </Text>

            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={26}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
                Apple Sign In is available on iOS only.
              </Text>
            )}

            {appleBusy ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : null}

            <Text style={[styles.footer, { color: colors.mutedForeground }]}>
              By continuing, you agree to our{' '}
              <Text style={{ color: colors.foreground, fontFamily: 'Manrope_600SemiBold' }}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={{ color: colors.foreground, fontFamily: 'Manrope_600SemiBold' }}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showBypassModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBypassModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Dev bypass</Text>
            <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
              Enter the server dev bypass code (DEV_BYPASS_CODE).
            </Text>
            <TextInput
              style={[
                styles.bypassInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                },
              ]}
              placeholder="Bypass code"
              placeholderTextColor={colors.mutedForeground}
              value={bypassCode}
              onChangeText={setBypassCode}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleDevBypass}
            />
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleDevBypass}
              disabled={!bypassCode.trim() || devBypass.isPending}
            >
              {devBypass.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                  Continue
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setShowBypassModal(false)}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 28,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  logoWrap: { alignItems: 'center', gap: 6 },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  logoLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2.5,
  },
  appName: {
    fontSize: 30,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    marginTop: -4,
  },
  heading: {
    fontSize: 19,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  appleBtn: {
    width: '100%',
    height: 52,
  },
  loader: { marginTop: -8 },
  btn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  backLink: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  bypassInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
});
