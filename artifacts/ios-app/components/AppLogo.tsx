import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const appIcon = require('@/assets/images/icon.png');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Columba app icon from assets/images/icon.png (1024×1024). */
export function AppLogo({ size = 88, style, onPress, accessibilityLabel }: AppLogoProps) {
  const radius = Math.round(size * 0.22);

  const image = (
    <Image
      source={appIcon}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel ?? 'Columba app logo'}
    />
  );

  if (!onPress) {
    return <View style={style}>{image}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Columba app logo'}
    >
      {image}
    </Pressable>
  );
}

export const APP_ICON_ASSET = appIcon;
