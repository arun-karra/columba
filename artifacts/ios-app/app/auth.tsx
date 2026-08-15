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
      style={[styles.root, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 60),
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={[styles.wordmark, { color: colors.accent }]}>kindred</Text>
          <Text style={[styles.tagline, { color: colors.primaryForeground, opacity: 0.65 }]}>
            shared notes for the people you love
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: colors.radius },
          ]}
        >
          {step === 'email' ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign in</Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                We'll send a one-time code to your email.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius / 2,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleSendCode}
                disabled={requestCode.isPending}
              >
                {requestCode.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                    Send code
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Check your email
              </Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={{ color: colors.foreground, fontFamily: 'Manrope_600SemiBold' }}>
                  {email}
                </Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
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
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor:
                      code.length === 6 ? colors.primary : colors.muted,
                    borderRadius: colors.radius / 2,
                    opacity: pressed ? 0.8 : 1,
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
                          code.length === 6
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    Sign in
                  </Text>
                )}
              </Pressable>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  brand: { alignItems: 'center', gap: 10 },
  wordmark: {
    fontSize: 44,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Manrope_700Bold',
  },
  cardBody: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 21,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    borderWidth: 1,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 30,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 10,
  },
  btn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  backBtn: { alignItems: 'center', paddingVertical: 4 },
  backBtnText: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
});
