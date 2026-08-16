import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <Label>Notes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groups">
        <Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} />
        <Label>Groups</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function TabIcon({
  name,
  sfName,
  sfNameFilled,
  focused,
  color,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  sfName: SFSymbol;
  sfNameFilled: SFSymbol;
  focused: boolean;
  color: string;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={focused ? sfNameFilled : sfName}
        tintColor={color}
        size={24}
        style={styles.symbol}
      />
    );
  }
  return <Feather name={name} size={22} color={color} />;
}

function ClassicTabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Notes',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="file-text"
              sfName="doc.text"
              sfNameFilled="doc.text.fill"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="users"
              sfName="person.3"
              sfNameFilled="person.3.fill"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="user"
              sfName="person.circle"
              sfNameFilled="person.circle.fill"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  symbol: { width: 28, height: 28 },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
