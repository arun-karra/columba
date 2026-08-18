import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

const ORBIT_NODES = [
  { emoji: '💼', position: 'topLeft' as const },
  { emoji: '🏠', position: 'bottomLeft' as const },
  { emoji: '👩‍❤️‍👨', position: 'topRight' as const },
];

const ORBIT_NODE_STYLES = {
  topLeft: { left: 8, top: 8 },
  bottomLeft: { left: 8, bottom: 24 },
  topRight: { right: 8, top: 18 },
};

export function GroupsOnboardingIllustration() {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.diagram}>
        <Svg width={280} height={280} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={140}
            y1={140}
            x2={36}
            y2={36}
            stroke={colors.border}
            strokeWidth={1.5}
            strokeDasharray="5 6"
          />
          <Line
            x1={140}
            y1={140}
            x2={36}
            y2={228}
            stroke={colors.border}
            strokeWidth={1.5}
            strokeDasharray="5 6"
          />
          <Line
            x1={140}
            y1={140}
            x2={244}
            y2={46}
            stroke={colors.border}
            strokeWidth={1.5}
            strokeDasharray="5 6"
          />
        </Svg>

        {ORBIT_NODES.map((node) => (
          <View
            key={node.emoji}
            style={[
              styles.orbitNode,
              ORBIT_NODE_STYLES[node.position],
              {
                backgroundColor: colors.card,
                shadowColor: colors.foreground,
              },
            ]}
          >
            <Text style={styles.emoji}>{node.emoji}</Text>
          </View>
        ))}

        <View
          style={[
            styles.hub,
            {
              backgroundColor: colors.card,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <AppIcon name="person.2" size={34} color={colors.foreground} />
        </View>

        <View
          style={[
            styles.addNode,
            {
              backgroundColor: colors.card,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <AppIcon name="plus" size={24} color={colors.primary} />
        </View>
      </View>
    </View>
  );
}

const nodeSize = 56;
const hubSize = 96;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  diagram: {
    width: 280,
    height: 280,
    alignSelf: 'center',
  },
  hub: {
    position: 'absolute',
    width: hubSize,
    height: hubSize,
    borderRadius: hubSize / 2,
    left: '50%',
    top: '50%',
    marginLeft: -hubSize / 2,
    marginTop: -hubSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  orbitNode: {
    position: 'absolute',
    width: nodeSize,
    height: nodeSize,
    borderRadius: nodeSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  addNode: {
    position: 'absolute',
    right: 18,
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  emoji: { fontSize: 24, lineHeight: 30 },
});
