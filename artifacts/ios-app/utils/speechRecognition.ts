import { Alert, Platform } from 'react-native';

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
  Alert.alert(
    'Install the latest Columba build',
    'Voice dictation needs a fresh development build with microphone support. Run an EAS dev build, install it on your iPhone, then open the app again.\n\nYou can keep typing notes normally until then.',
    [{ text: 'OK' }],
  );
}
