import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cachedModule: SpeechModule | null | undefined;

/** Returns the native module when this dev build includes expo-speech-recognition. */
export function getSpeechRecognitionModule(): SpeechModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'ios') {
    cachedModule = null;
    return null;
  }

  try {
    const pkg = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: SpeechModule;
    };
    cachedModule = pkg.ExpoSpeechRecognitionModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export function isSpeechRecognitionNativeLinked(): boolean {
  return getSpeechRecognitionModule() != null;
}

export function showDictationRebuildAlert() {
  const onSimulator = Platform.OS === 'ios' && !Constants.isDevice;
  Alert.alert(
    'Install the latest Columba build',
    onSimulator
      ? 'Voice dictation needs a new simulator development build (a Metro reload is not enough).\n\nOn your Mac, from the repo root:\n\npnpm --filter @workspace/ios-app run eas:build:sim\n\nWhen the build finishes, install it on the iOS Simulator, then run:\n\npnpm --filter @workspace/ios-app run start\n\nYou can keep typing notes until then.'
      : 'Voice dictation needs a fresh iPhone development build (a Metro reload is not enough).\n\nOn your Mac, from the repo root:\n\npnpm --filter @workspace/ios-app run eas:build:dev\n\nInstall the new build on your iPhone, then run:\n\npnpm --filter @workspace/ios-app run start\n\nYou can keep typing notes until then.',
    [{ text: 'OK' }],
  );
}
