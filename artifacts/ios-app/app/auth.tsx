import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { GetStartedPanel } from '@/components/onboarding/GetStartedPanel';
import { GroupsOnboardingIllustration } from '@/components/onboarding/GroupsOnboardingIllustration';
import { NotesOnboardingIllustration } from '@/components/onboarding/NotesOnboardingIllustration';
import { OnboardingBackground } from '@/components/onboarding/OnboardingBackground';
import { OnboardingNavButton } from '@/components/onboarding/OnboardingNavButton';
import { OnboardingPageIndicator } from '@/components/onboarding/OnboardingPageIndicator';
import { RemindersOnboardingIllustration } from '@/components/onboarding/RemindersOnboardingIllustration';
import { useAppleSignIn } from '@/hooks/useAppleSignIn';
import { useColors } from '@/hooks/useColors';
import { useScreenGutter } from '@/constants/layout';
import {
  hasSeenOnboardingSlides,
  markOnboardingSlidesSeen,
} from '@/utils/onboardingStorage';

const SLIDE_COUNT = 3;

const SLIDES = [
  {
    title: 'Simple Notes and Reminders',
    body: 'Quickly capture thoughts without the clutter of titles and bodies.',
    button: 'CONTINUE',
    Illustration: NotesOnboardingIllustration,
    showWaves: true,
  },
  {
    title: 'Groups, for Anything',
    body: "Whether it's for Couples, Housemates, or Colleagues, invite others to collaborate on shared note groups with ease.",
    button: 'NEXT',
    Illustration: GroupsOnboardingIllustration,
    showWaves: false,
  },
  {
    title: 'Timely Reminders',
    body: 'Receive instant notifications or schedule them for later so you never miss a beat.',
    button: 'GET STARTED',
    Illustration: RemindersOnboardingIllustration,
    showWaves: false,
  },
] as const;

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  const {
    appleBusy,
    appleAvailable,
    showBypassModal,
    setShowBypassModal,
    bypassCode,
    setBypassCode,
    handleAppleSignIn,
    handleDevBypass,
    handleDevBypassTap,
  } = useAppleSignIn();

  useEffect(() => {
    void hasSeenOnboardingSlides().then((seen) => {
      if (seen) setStep(SLIDE_COUNT);
      setReady(true);
    });
  }, []);

  const goToSignIn = useCallback(async () => {
    await markOnboardingSlidesSeen();
    setStep(SLIDE_COUNT);
  }, []);

  const advance = useCallback(async () => {
    if (step >= SLIDE_COUNT - 1) {
      await goToSignIn();
      return;
    }
    setStep((current) => current + 1);
  }, [goToSignIn, step]);

  if (!ready) {
    return (
      <OnboardingBackground>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </OnboardingBackground>
    );
  }

  if (step >= SLIDE_COUNT) {
    return (
      <OnboardingBackground>
        <Pressable style={styles.devTapZone} onPress={handleDevBypassTap} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <View
            style={[
              styles.signInWrap,
              {
                paddingBottom: insets.bottom + 24,
                paddingHorizontal: gutter,
              },
            ]}
          >
            <GetStartedPanel />

            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={28}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Text style={[styles.appleFallback, { color: colors.mutedForeground }]}>
                Apple Sign In is available on iOS only.
              </Text>
            )}

            {appleBusy ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : null}
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Dev bypass</Text>
              <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
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
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleDevBypass}
                disabled={!bypassCode.trim() || appleBusy}
              >
                {appleBusy ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>
                    Continue
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setShowBypassModal(false)}>
                <Text style={[styles.cancelLink, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </OnboardingBackground>
    );
  }

  const slide = SLIDES[step];
  const Illustration = slide.Illustration;

  return (
    <OnboardingBackground showWaves={slide.showWaves}>
      <View
        style={[
          styles.slideRoot,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: gutter,
          },
        ]}
      >
        <View style={styles.illustrationArea}>
          <Illustration />
        </View>

        <View style={styles.copyBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>{slide.title}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{slide.body}</Text>
        </View>

        <OnboardingPageIndicator count={SLIDE_COUNT} activeIndex={step} />
        <OnboardingNavButton label={slide.button} onPress={() => void advance()} />
      </View>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideRoot: {
    flex: 1,
  },
  illustrationArea: {
    flex: 1,
    minHeight: 280,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    maxWidth: 340,
  },
  kav: { flex: 1, justifyContent: 'flex-end' },
  signInWrap: {
    gap: 18,
    paddingTop: 24,
  },
  appleBtn: {
    width: '100%',
    height: 56,
  },
  appleFallback: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
  loader: { marginTop: -4 },
  devTapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
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
  modalTitle: {
    fontSize: 19,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  bypassInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  modalBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  cancelLink: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
});
