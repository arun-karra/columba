import React from 'react';
import { Image } from 'expo-image';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

/** In-app logo with true alpha; `icon.png` stays opaque for the native app icon. */
const appLogo = require('@/assets/images/logo.png');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Columba app icon — renders without an extra background plate (PNG is pre-rounded). */
export function AppLogo({ size = 88, style, onPress, accessibilityLabel }: AppLogoProps) {
  const image = (
    <Image
      source={appLogo}
      style={{
        width: size,
        height: size,
        backgroundColor: 'transparent',
      }}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel ?? 'Columba app logo'}
    />
  );

  if (!onPress) {
    return (
      <View style={[{ backgroundColor: 'transparent' }, style]}>
        {image}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[{ backgroundColor: 'transparent' }, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Columba app logo'}
    >
      {image}
    </Pressable>
  );
}

export const APP_ICON_ASSET = appLogo;
