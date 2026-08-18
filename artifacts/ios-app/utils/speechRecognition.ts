import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cachedModule: SpeechModule | null | undefined;

/** Returns the native module when this dev build includes expo-speech-recognition. */
export function getSpeechRecognitionModule(): SpeechModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'ios') {
    cachedModule = null;
    return null;
  }

  // Do NOT require('expo-speech-recognition') here — that package throws if the
  // native module is missing. Optional lookup returns null instead.
  cachedModule = requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');
  return cachedModule;
}

export function isSpeechRecognitionNativeLinked(): boolean {
  return getSpeechRecognitionModule() != null;
}

export function showDictationRebuildAlert() {
  const onSimulator = Platform.OS === 'ios' && !Constants.isDevice;
  Alert.alert(
    'Rebuild the Columba simulator app',
    onSimulator
      ? 'Voice dictation is not in your current simulator build yet (pnpm mac:dev only updates JavaScript).\n\nOn your Mac, from the repo root, run ONE of:\n\n• pnpm mac:sim   (EAS simulator build)\n• cd artifacts/ios-app && npx expo run:ios   (local Xcode build)\n\nThen open the new Columba app in the simulator and run pnpm mac:dev again.\n\nYou can keep typing notes until then.'
      : 'Voice dictation needs a fresh iPhone development build.\n\nFrom the repo root:\n\npnpm --filter @workspace/ios-app run eas:build:dev\n\nInstall the new build, then start Metro again.\n\nYou can keep typing notes until then.',
    [{ text: 'OK' }],
  );
}
