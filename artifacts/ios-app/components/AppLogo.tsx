import React from 'react';
import { Image } from 'expo-image';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

const appIcon = require('@/assets/images/icon.png');

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
      source={appIcon}
      style={{
        width: size,
        height: size,
        backgroundColor: 'transparent',
      }}
      contentFit="contain"
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

export const APP_ICON_ASSET = appIcon;
