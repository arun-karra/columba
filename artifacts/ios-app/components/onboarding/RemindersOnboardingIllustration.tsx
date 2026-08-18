import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { GroupAvatar } from '@/components/GroupAvatar';

export function RemindersOnboardingIllustration() {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.halo, { backgroundColor: `${colors.card}77` }]}>
        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
          <View style={[styles.noteRow, { backgroundColor: colors.card }]}>
            <GroupAvatar
              fallbackInitials="DT"
              size={40}
              backgroundColor={colors.sky}
              initialsColor={colors.foreground}
            />
            <Text
              style={[styles.noteText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              Work on project brief
            </Text>
            <AppIcon name="chevron.right" size={16} color={colors.mutedForeground} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  halo: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingVertical: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  previewCard: {
    width: '100%',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  noteText: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
  },
});
