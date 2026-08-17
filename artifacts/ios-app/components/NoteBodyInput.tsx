import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { useColors } from '@/hooks/useColors';
import type { DictationState } from '@/hooks/useNoteDictation';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
  dictationState: DictationState;
  showMicButton: boolean;
  isDictationSupported: boolean;
  onToggleDictation: () => void;
};

export function NoteBodyInput({
  value,
  onChangeText,
  dictationState,
  showMicButton,
  isDictationSupported,
  onToggleDictation,
  style,
  ...textInputProps
}: Props) {
  const colors = useColors();
  const isListening = dictationState === 'listening';
  const isDenied = dictationState === 'denied';
  const isError = dictationState === 'error';

  const micColor = isListening
    ? colors.destructive
    : !isDictationSupported || isDenied || isError
      ? colors.mutedForeground
      : colors.primary;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.secondary,
          borderRadius: colors.radius,
          borderColor: isListening ? colors.destructive : 'transparent',
          borderWidth: isListening ? 2 : 0,
        },
      ]}
    >
      <TextInput
        {...textInputProps}
        style={[styles.input, { color: colors.foreground }, style]}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
      />

      {showMicButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isListening ? 'Stop dictation' : 'Start voice dictation'
          }
          accessibilityState={{ selected: isListening }}
          style={({ pressed }) => [
            styles.micButton,
            {
              backgroundColor: isListening ? `${colors.destructive}18` : colors.card,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={onToggleDictation}
          hitSlop={8}
        >
          {isListening ? (
            <View style={styles.listeningDotWrap}>
              <View style={[styles.listeningDot, { backgroundColor: colors.destructive }]} />
            </View>
          ) : (
            <AppIcon name="mic.fill" size={20} color={micColor} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    minHeight: 140,
  },
  input: {
    minHeight: 140,
    paddingTop: 16,
    paddingLeft: 16,
    paddingRight: 56,
    paddingBottom: 16,
    fontSize: 22,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 32,
  },
  micButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  listeningDotWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
