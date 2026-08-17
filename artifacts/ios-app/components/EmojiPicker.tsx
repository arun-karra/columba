import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { QUICK_GROUP_EMOJI_OPTIONS } from '@/utils/groupEmoji';

type Props = {
  value: string;
  onChange: (emoji: string) => void;
};

const CHIP_SIZE = 44;

function firstEmoji(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return [...trimmed.normalize('NFC')][0] ?? '';
}

function normalizeEmoji(emoji: string): string {
  return emoji.normalize('NFC');
}

function isQuickEmoji(emoji: string): boolean {
  const normalized = normalizeEmoji(emoji);
  return QUICK_GROUP_EMOJI_OPTIONS.some((option) => normalizeEmoji(option) === normalized);
}

export function EmojiPicker({ value, onChange }: Props) {
  const colors = useColors();
  const normalizedValue = normalizeEmoji(value);
  const customSelected = normalizedValue.length > 0 && !isQuickEmoji(normalizedValue);

  const pickEmoji = (emoji: string) => {
    Haptics.selectionAsync();
    onChange(normalizeEmoji(emoji));
  };

  const openCustomEmojiPicker = () => {
    Haptics.selectionAsync();
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Choose emoji',
        'Type or paste any emoji',
        (text) => {
          const emoji = firstEmoji(text ?? '');
          if (emoji) onChange(emoji);
        },
        'plain-text',
        customSelected ? normalizedValue : '',
      );
      return;
    }
    Alert.alert('Choose emoji', 'Paste an emoji into the group name field for now.');
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
      <View style={styles.row} pointerEvents="box-none">
        {QUICK_GROUP_EMOJI_OPTIONS.map((emoji) => {
          const selected = normalizedValue === normalizeEmoji(emoji);
          return (
            <TouchableOpacity
              key={emoji}
              activeOpacity={0.7}
              onPress={() => pickEmoji(emoji)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Select ${emoji} icon`}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.secondary : colors.muted,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.emoji} pointerEvents="none">
                {emoji}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openCustomEmojiPicker}
          accessibilityRole="button"
          accessibilityLabel="Search for any emoji"
          style={[
            styles.chip,
            styles.moreChip,
            {
              backgroundColor: customSelected ? colors.secondary : colors.muted,
              borderColor: customSelected ? colors.primary : colors.border,
            },
          ]}
        >
          {customSelected ? (
            <Text style={styles.emoji} pointerEvents="none">
              {normalizedValue}
            </Text>
          ) : (
            <AppIcon name="plus.magnifyingglass" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    paddingLeft: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  moreChip: { borderStyle: 'dashed' },
  emoji: { fontSize: 22, lineHeight: 26 },
});
