import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { useScreenGutter } from '@/constants/layout';

interface NoteActionsSheetProps {
  visible: boolean;
  noteBody?: string;
  canResend: boolean;
  onClose: () => void;
  onResend: () => void;
}

/** Bottom action sheet for note long-press (replaces centered iOS ActionSheet popover). */
export function NoteActionsSheet({
  visible,
  noteBody,
  canResend,
  onClose,
  onResend,
}: NoteActionsSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useScreenGutter();

  if (!canResend) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss actions"
        />
        <View
          style={[
            styles.sheetWrap,
            {
              paddingHorizontal: gutter,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {noteBody ? (
            <View
              style={[
                styles.preview,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[styles.previewText, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {noteBody}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.actionGroup,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.65 : 1 },
              ]}
              onPress={() => {
                onClose();
                onResend();
              }}
              accessibilityRole="button"
              accessibilityLabel="Resend notification"
            >
              <AppIcon name="bell.badge" size={20} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                Resend Notification
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelLabel, { color: colors.foreground }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheetWrap: {
    gap: 10,
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewText: {
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
    textAlign: 'center',
  },
  actionGroup: {
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  actionLabel: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
  },
  cancelBtn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
  },
});
