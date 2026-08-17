import React from 'react';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const FEATHER_FALLBACK: Record<string, FeatherName> = {
  'chevron.right': 'chevron-right',
  'plus': 'plus',
  'xmark': 'x',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'trash': 'trash-2',
  'person': 'user',
  'person.2': 'users',
  'person.badge.plus': 'user-plus',
  'person.badge.minus': 'user-minus',
  'envelope': 'mail',
  'bell': 'bell',
  'gearshape': 'settings',
  'arrow.clockwise': 'rotate-cw',
  'arrow.counterclockwise': 'rotate-ccw',
  'lock.fill': 'lock',
  'exclamationmark.circle': 'alert-circle',
  'calendar': 'calendar',
  'clock': 'clock',
  'sun.max': 'sun',
  'square.and.pencil': 'edit-2',
  'paperplane.fill': 'send',
  'rectangle.portrait.and.arrow.right': 'log-out',
  'globe': 'globe',
  'iphone': 'smartphone',
  'internaldrive': 'database',
  'mic': 'mic',
  'mic.fill': 'mic',
  'magnifyingglass': 'search',
  'plus.magnifyingglass': 'search',
  'face.smiling': 'smile',
  'delete.left': 'delete',
};

export function AppIcon({
  name,
  size = 22,
  color,
}: {
  name: SFSymbol;
  size?: number;
  color: string;
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name} size={size} tintColor={color} />;
  }
  return (
    <Feather
      name={FEATHER_FALLBACK[name] ?? 'circle'}
      size={size}
      color={color}
    />
  );
}
