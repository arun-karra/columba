import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { AppLogo } from '@/components/AppLogo';
import { AppIcon } from '@/components/AppIcon';

/** iOS lock-screen style push notification mockup */
export function RemindersOnboardingIllustration() {
  const colors = useColors();
  const bannerY = useSharedValue(-16);
  const bannerOpacity = useSharedValue(0);

  useEffect(() => {
    bannerOpacity.value = 0;
    bannerY.value = -16;
    bannerOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    bannerY.value = withDelay(120, withSpring(0, { damping: 16, stiffness: 140 }));
  }, [bannerOpacity, bannerY]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.phoneBezel, { backgroundColor: `${colors.card}55` }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusTime, { color: colors.foreground }]}>9:41</Text>
        </View>

        <Animated.View
          style={[
            styles.notificationBanner,
            bannerStyle,
            {
              backgroundColor: `${colors.card}F2`,
              borderColor: colors.border,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <AppLogo size={36} />
          <View style={styles.notifyTextCol}>
            <View style={styles.notifyTitleRow}>
              <Text style={[styles.notifyApp, { color: colors.foreground }]}>COLUMBA</Text>
              <Text style={[styles.notifyTime, { color: colors.mutedForeground }]}>now</Text>
            </View>
            <Text style={[styles.notifyTitle, { color: colors.foreground }]} numberOfLines={1}>
              Work on project brief
            </Text>
            <Text
              style={[styles.notifyBody, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              Reminder from your Personal notes
            </Text>
          </View>
        </Animated.View>

        <View style={[styles.lockHint, { backgroundColor: colors.muted }]}>
          <AppIcon name="lock.fill" size={12} color={colors.mutedForeground} />
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
    paddingHorizontal: 20,
  },
  phoneBezel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 28,
    minHeight: 280,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  statusTime: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  notifyTextCol: {
    flex: 1,
    gap: 2,
  },
  notifyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifyApp: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.6,
  },
  notifyTime: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
  },
  notifyTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 2,
  },
  notifyBody: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Manrope_400Regular',
  },
  lockHint: {
    alignSelf: 'center',
    marginTop: 28,
    width: 36,
    height: 4,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
