import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRequestAuthCode, useVerifyAuthCode } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/AppIcon';
import { useScreenGutter } from '@/constants/layout';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const requestCode = useRequestAuthCode();
  const verifyCode = useVerifyAuthCode();

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await requestCode.mutateAsync({ data: { email: email.trim().toLowerCase() } });
      setStep('code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await verifyCode.mutateAsync({
        data: { email: email.trim().toLowerCase(), code },
      });
      await signIn(res.token, res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Wrong code', "That code didn't match. Try again.");
      setCode('');
    }
  };

  const emailValid = email.trim().length > 0 && email.includes('@');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              <View style={[styles.logoBox, { backgroundColor: colors.secondary }]}>
                <AppIcon name="paperplane.fill" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.logoLabel, { color: colors.primary }]}>COLUMBA</Text>
            </View>

            <Text style={[styles.appName, { color: colors.foreground }]}>Columba</Text>

            {step === 'email' ? (
              <>
                <Text style={[styles.heading, { color: colors.foreground }]}>
                  Welcome to Columba
                </Text>
                <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
                  Enter your email to receive a magic link and step into a clearer workspace.
                </Text>

                {/* Email input */}
                <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                  <AppIcon name="envelope" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSendCode}
                  />
                </View>

                <Pressable
                  style={[
                    styles.btn,
                    {
                      backgroundColor: emailValid ? colors.primary : colors.secondary,
                    },
                  ]}
                  onPress={handleSendCode}
                  disabled={!emailValid || requestCode.isPending}
                >
                  {requestCode.isPending ? (
                    <ActivityIndicator
                      color={emailValid ? colors.primaryForeground : colors.mutedForeground}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.btnText,
                        {
                          color: emailValid
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      Send Magic Link  →
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.heading, { color: colors.foreground }]}>
                  Check your email
                </Text>
                <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
                  We sent a 6-digit code to{'\n'}
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: 'Manrope_600SemiBold',
                    }}
                  >
                    {email}
                  </Text>
                </Text>

                <TextInput
                  style={[
                    styles.codeInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.muted,
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />

                <Pressable
                  style={[
                    styles.btn,
                    {
                      backgroundColor:
                        code.length === 6 ? colors.primary : colors.secondary,
                    },
                  ]}
                  onPress={handleVerify}
                  disabled={code.length !== 6 || verifyCode.isPending}
                >
                  {verifyCode.isPending ? (
                    <ActivityIndicator
                      color={
                        code.length === 6
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.btnText,
                        {
                          color:
                            code.length === 6
                              ? colors.primaryForeground
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      Verify  →
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStep('email');
                    setCode('');
                  }}
                >
                  <Text style={[styles.backLink, { color: colors.mutedForeground }]}>
                    ← Change email
                  </Text>
                </Pressable>
              </>
            )}

            {/* Footer */}
            <Text style={[styles.footer, { color: colors.mutedForeground }]}>
              By continuing, you agree to our{' '}
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: 'Manrope_600SemiBold',
                }}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: 'Manrope_600SemiBold',
                }}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginVertical: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },

  codeInput: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 10,
    marginVertical: 2,
  },

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
});
