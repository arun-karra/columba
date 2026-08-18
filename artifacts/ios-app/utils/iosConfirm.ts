import { ActionSheetIOS, Alert, Platform } from 'react-native';

/** Native action sheet on iOS, alert elsewhere. */
export function confirmDestructive(options: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: options.title,
        message: options.message,
        options: ['Cancel', options.confirmLabel],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) options.onConfirm();
      },
    );
    return;
  }

  Alert.alert(options.title, options.message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: options.confirmLabel,
      style: 'destructive',
      onPress: options.onConfirm,
    },
  ]);
}

/** UIAlertController text prompt on iOS. Returns false if the caller should show its own UI. */
export function promptText(options: {
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
}): boolean {
  if (Platform.OS !== 'ios') return false;

  Alert.prompt(
    options.title,
    options.message,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: options.confirmLabel,
        onPress: (value?: string) => {
          const trimmed = value?.trim();
          if (trimmed) options.onSubmit(trimmed);
        },
      },
    ],
    'plain-text',
    '',
    'default',
  );
  return true;
}

