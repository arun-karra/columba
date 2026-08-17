import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';
import {
  getSpeechRecognitionModule,
  isSpeechRecognitionNativeLinked,
  showDictationRebuildAlert,
} from '@/utils/speechRecognition';

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
  const onBodyChangeRef = useRef(onBodyChange);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  useEffect(() => {
    onBodyChangeRef.current = onBodyChange;
  }, [onBodyChange]);

  const nativeLinked = isSpeechRecognitionNativeLinked();
  const isSupported = Platform.OS === 'ios' && nativeLinked;
  const showMicButton = Platform.OS === 'ios';

  useEffect(() => {
    const module = getSpeechRecognitionModule();
    if (!module) return;

    const onStart = () => {
      listeningRef.current = true;
      setState('listening');
    };

    const onEnd = () => {
      listeningRef.current = false;
      setState((current) => (current === 'denied' ? 'denied' : 'idle'));
    };

    const onResult = (event: ExpoSpeechRecognitionResultEvent) => {
      const spoken = event.results[0]?.transcript ?? '';
      const prefix = prefixRef.current;
      if (!spoken) {
        onBodyChangeRef.current(prefix.trimEnd());
        return;
      }
      const spacer = prefix.length > 0 && !/\s$/.test(prefix) ? ' ' : '';
      onBodyChangeRef.current(`${prefix}${spacer}${spoken}`);
    };

    const onError = (event: ExpoSpeechRecognitionErrorEvent) => {
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
    };

    const subscriptions = [
      module.addListener('start', onStart),
      module.addListener('end', onEnd),
      module.addListener('result', onResult),
      module.addListener('error', onError),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [nativeLinked]);

  useEffect(() => {
    return () => {
      const module = getSpeechRecognitionModule();
      if (listeningRef.current && module) {
        module.abort();
      }
    };
  }, []);

  const stopDictation = useCallback(() => {
    const module = getSpeechRecognitionModule();
    if (!listeningRef.current || !module) return;
    module.stop();
  }, []);

  const startDictation = useCallback(async () => {
    const module = getSpeechRecognitionModule();
    if (!module) {
      showDictationRebuildAlert();
      return;
    }

    const mic = await module.requestMicrophonePermissionsAsync();
    if (!mic.granted) {
      setState('denied');
      showPermissionHelp();
      return;
    }

    const speech = await module.requestSpeechRecognizerPermissionsAsync();
    if (!speech.granted) {
      setState('denied');
      showPermissionHelp();
      return;
    }

    const trimmed = bodyRef.current.trimEnd();
    prefixRef.current = trimmed.length > 0 ? `${trimmed} ` : '';

    const prefersOnDevice = module.supportsOnDeviceRecognition();

    try {
      module.start({
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
  }, []);

  const toggleDictation = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Dictation is iOS only',
        'Voice dictation needs the Columba iPhone app. You can type your note here instead.',
      );
      return;
    }

    if (!isSpeechRecognitionNativeLinked()) {
      showDictationRebuildAlert();
      return;
    }

    if (listeningRef.current) {
      stopDictation();
      return;
    }

    setState('idle');
    await startDictation();
  }, [startDictation, stopDictation]);

  return {
    dictationState: state,
    isDictationSupported: isSupported,
    showMicButton,
    isListening: state === 'listening',
    toggleDictation,
  };
}
