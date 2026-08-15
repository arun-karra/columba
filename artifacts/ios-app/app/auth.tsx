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
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRequestAuthCode, useVerifyAuthCode } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
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
      Alert.alert('Oops!', msg);
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
      Alert.alert('Wrong code 🙈', 'That code didn\'t match. Try again!');
      setCode('');
    }
  };

  const emailValid = email.trim().length > 0 && email.includes('@');
  const isRequestPending = requestCode.isPending;
  const isVerifyPending = verifyCode.isPending;

  return (
    <LinearGradient
      colors={['#122A26', '#1A4F48', '#1E5C54']}
      style={styles.root}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 52),
              paddingBottom: insets.bottom + 36,
            },
          ]}
        >
          {/* Wordmark */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkText}>Columba</Text>
            <Text style={styles.tagline}>notes that actually stick 📌</Text>
          </View>

          {/* Glass card */}
          <BlurView
            intensity={scheme === 'dark' ? 25 : 50}
            tint="dark"
            style={styles.card}
          >
            <View style={styles.cardInner}>
              {step === 'email' ? (
                <>
                  <Text style={styles.cardTitle}>Hey there! 👋</Text>
                  <Text style={styles.cardSub}>
                    Enter your email and we'll send a magic code — no password needed!
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255,255,255,0.38)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSendCode}
                    autoFocus
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: emailValid ? colors.accent : 'rgba(255,255,255,0.12)',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    onPress={handleSendCode}
                    disabled={isRequestPending || !emailValid}
                  >
                    {isRequestPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.btnText, { color: emailValid ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }]}>
                        Send magic code ✨
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => { setStep('email'); setCode(''); }}
                    style={styles.backRow}
                  >
                    <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.65)" />
                    <Text style={styles.backText}>Back</Text>
                  </Pressable>

                  <Text style={styles.cardTitle}>Check your inbox 📬</Text>
                  <Text style={styles.cardSub}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>

                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="· · · · · ·"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                    autoFocus
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: code.length === 6 ? colors.accent : 'rgba(255,255,255,0.12)',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    onPress={handleVerify}
                    disabled={isVerifyPending || code.length !== 6}
                  >
                    {isVerifyPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.btnText, { color: code.length === 6 ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }]}>
                        Let me in! 🚀
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  wordmark: { alignItems: 'center', gap: 12 },
  wordmarkText: {
    fontSize: 56,
    fontFamily: 'Manrope_700Bold',
    color: '#F5A623',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  card: { borderRadius: 28, overflow: 'hidden' },
  cardInner: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 28,
    gap: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },

  input: {
    height: 58,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 17,
    fontFamily: 'Manrope_500Medium',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 30,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 12,
  },

  btn: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.65)',
  },
});
