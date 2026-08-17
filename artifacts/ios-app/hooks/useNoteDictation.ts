import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type DictationState = 'idle' | 'listening' | 'denied' | 'error';

function getSpeechLocale(): string {
  if (Platform.OS !== 'ios') return 'en-US';
  const appleLanguages = NativeModules.SettingsManager?.settings?.AppleLanguages as
    | string[]
    | undefined;
  return appleLanguages?.[0]?.replace('_', '-') ?? 'en-US';
}

function showPermissionHelp() {
  Alert.alert(
    'Turn on Microphone & Speech Recognition',
    'To dictate notes, open Settings → Columba and enable Microphone and Speech Recognition. You can still type notes normally.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
}

async function ensureDictationPermissions(): Promise<boolean> {
  const mic = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  if (!mic.granted) return false;

  if (Platform.OS === 'ios') {
    const speech =
      await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
    if (!speech.granted) return false;
  }

  return true;
}

export function useNoteDictation({
  body,
  onBodyChange,
}: {
  body: string;
  onBodyChange: (value: string) => void;
}) {
  const [state, setState] = useState<DictationState>('idle');
  const prefixRef = useRef('');
  const listeningRef = useRef(false);
  const bodyRef = useRef(body);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  const isSupported = Platform.OS === 'ios';

  useSpeechRecognitionEvent('start', () => {
    listeningRef.current = true;
    setState('listening');
  });

  useSpeechRecognitionEvent('end', () => {
    listeningRef.current = false;
    setState((current) => (current === 'denied' ? 'denied' : 'idle'));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const spoken = event.results[0]?.transcript ?? '';
    const prefix = prefixRef.current;
    if (!spoken) {
      onBodyChange(prefix.trimEnd());
      return;
    }
    const spacer = prefix.length > 0 && !/\s$/.test(prefix) ? ' ' : '';
    onBodyChange(`${prefix}${spacer}${spoken}`);
  });

  useSpeechRecognitionEvent('error', (event) => {
    listeningRef.current = false;
    if (event.error === 'not-allowed') {
      setState('denied');
      showPermissionHelp();
      return;
    }
    setState('error');
    Alert.alert(
      'Dictation unavailable',
      'Something went wrong while listening. You can keep typing your note.',
    );
  });

  useEffect(() => {
    return () => {
      if (listeningRef.current) {
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  const stopDictation = useCallback(() => {
    if (!listeningRef.current) return;
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const startDictation = useCallback(async () => {
    if (!isSupported) return;

    const granted = await ensureDictationPermissions();
    if (!granted) {
      setState('denied');
      showPermissionHelp();
      return;
    }

    const trimmed = bodyRef.current.trimEnd();
    prefixRef.current = trimmed.length > 0 ? `${trimmed} ` : '';

    const prefersOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

    try {
      ExpoSpeechRecognitionModule.start({
        lang: getSpeechLocale(),
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: prefersOnDevice,
        iosTaskHint: 'dictation',
      });
    } catch {
      setState('error');
      Alert.alert(
        'Dictation unavailable',
        'Could not start listening on this device. You can still type your note.',
      );
    }
  }, [isSupported]);

  const toggleDictation = useCallback(async () => {
    if (!isSupported) {
      Alert.alert(
        'Dictation is iOS only',
        'Voice dictation needs the Columba iPhone app. You can type your note here instead.',
      );
      return;
    }

    if (listeningRef.current) {
      stopDictation();
      return;
    }

    setState('idle');
    await startDictation();
  }, [isSupported, startDictation, stopDictation]);

  return {
    dictationState: state,
    isDictationSupported: isSupported,
    isListening: state === 'listening',
    toggleDictation,
  };
}
