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
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRequestAuthCode, useVerifyAuthCode } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { TapScale } from '@/components/TapScale';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Invalid code', 'The code was incorrect or has expired. Please try again.');
      setCode('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40),
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary, borderRadius: 22 }]}>
            <Feather name="file-text" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.wordmark, { color: colors.foreground }]}>Columba</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Notes that find their way to you.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: 18,
                  },
                ]}
                placeholder="you@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
              <TapScale
                style={[
                  styles.btn,
                  { backgroundColor: colors.primary, borderRadius: 18 },
                ]}
                onPress={handleSendCode}
                disabled={requestCode.isPending}
              >
                {requestCode.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                    Get my code
                  </Text>
                )}
              </TapScale>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                No passwords. We'll email you a one-time code.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.codeHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  Check your inbox
                </Text>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                  Enter the 6-digit code we sent to{' '}
                  <Text style={{ color: colors.foreground, fontFamily: 'Manrope_600SemiBold' }}>
                    {email}
                  </Text>
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: 18,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
              />
              <TapScale
                style={[
                  styles.btn,
                  {
                    backgroundColor: code.length === 6 ? colors.primary : colors.muted,
                    borderRadius: 18,
                  },
                ]}
                onPress={handleVerify}
                disabled={verifyCode.isPending || code.length !== 6}
              >
                {verifyCode.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      {
                        color:
                          code.length === 6 ? colors.primaryForeground : colors.mutedForeground,
                      },
                    ]}
                  >
                    Verify &amp; continue
                  </Text>
                )}
              </TapScale>
              <Pressable
                style={styles.backBtn}
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
              >
                <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>
                  ← Use a different email
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    gap: 40,
  },
  brand: { alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  wordmark: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: { gap: 14 },
  codeHeader: { gap: 6, marginBottom: 4 },
  cardTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_800ExtraBold',
  },
  cardBody: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 21,
  },
  input: {
    height: 60,
    paddingHorizontal: 20,
    fontSize: 17,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 2,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 30,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 12,
  },
  btn: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },
  helper: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  backBtn: { alignItems: 'center', paddingVertical: 6, marginTop: 2 },
  backBtnText: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
});
