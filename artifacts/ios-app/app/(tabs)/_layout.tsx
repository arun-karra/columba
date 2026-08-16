import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';

// iOS 26+: native liquid-glass tab bar
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

// ─── Tab icon with active circle ─────────────────────────────────────────────

function TabIcon({
  name,
  sfName,
  sfNameFilled,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  sfName: SFSymbol;
  sfNameFilled: SFSymbol;
  focused: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && {
          backgroundColor: colors.secondary,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <SymbolView
          name={focused ? sfNameFilled : sfName}
          tintColor={focused ? colors.primary : colors.mutedForeground}
          size={20}
        />
      ) : (
        <Feather
          name={name}
          size={20}
          color={focused ? colors.primary : colors.mutedForeground}
        />
      )}
    </View>
  );
}

// Older iOS / Android / Web: classic Tabs
function ClassicTabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Manrope_500Medium',
          fontSize: 11,
          marginTop: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          // subtle top shadow so the bar lifts from content
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Notes',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="file-text"
              sfName="doc.text"
              sfNameFilled="doc.text.fill"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="users"
              sfName="person.3"
              sfNameFilled="person.3.fill"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="user"
              sfName="person.circle"
              sfNameFilled="person.circle.fill"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
