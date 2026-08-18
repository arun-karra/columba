import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

const ORBIT_NODES = [
  { emoji: '💼', position: 'topLeft' as const, delay: 180 },
  { emoji: '🏠', position: 'bottomLeft' as const, delay: 260 },
  { emoji: '👩‍❤️‍👨', position: 'topRight' as const, delay: 340 },
];

const ORBIT_NODE_STYLES = {
  topLeft: { left: 8, top: 8 },
  bottomLeft: { left: 8, bottom: 24 },
  topRight: { right: 8, top: 18 },
};

function OrbitNode({
  emoji,
  position,
  delay,
  cardColor,
  shadowColor,
}: {
  emoji: string;
  position: keyof typeof ORBIT_NODE_STYLES;
  delay: number;
  cardColor: string;
  shadowColor: string;
}) {
  const scale = useSharedValue(0.55);
  const opacity = useSharedValue(0.4);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(delay, withSpring(1, { damping: 13, stiffness: 150 }));
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orbitNode,
        ORBIT_NODE_STYLES[position],
        style,
        {
          backgroundColor: cardColor,
          shadowColor,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

export function GroupsOnboardingIllustration() {
  const colors = useColors();
  const hubScale = useSharedValue(0.7);
  const hubOpacity = useSharedValue(0.45);
  const addScale = useSharedValue(0.5);
  const addOpacity = useSharedValue(0.35);
  const lineOpacity = useSharedValue(0.25);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    hubOpacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    hubScale.value = withSpring(1, { damping: 14, stiffness: 130 });
    lineOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
    addOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
    addScale.value = withDelay(420, withSpring(1, { damping: 11, stiffness: 170 }));
  }, [addOpacity, addScale, hubOpacity, hubScale, lineOpacity]);

  const hubStyle = useAnimatedStyle(() => ({
    opacity: hubOpacity.value,
    transform: [{ scale: hubScale.value }],
  }));

  const addStyle = useAnimatedStyle(() => ({
    opacity: addOpacity.value,
    transform: [{ scale: addScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.diagram}>
        <Animated.View style={[StyleSheet.absoluteFill, lineStyle]}>
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
        </Animated.View>

        {ORBIT_NODES.map((node) => (
          <OrbitNode
            key={node.emoji}
            emoji={node.emoji}
            position={node.position}
            delay={node.delay}
            cardColor={colors.card}
            shadowColor={colors.foreground}
          />
        ))}

        <Animated.View
          style={[
            styles.hub,
            hubStyle,
            {
              backgroundColor: colors.card,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <AppIcon name="person.2" size={34} color={colors.foreground} />
        </Animated.View>

        <Animated.View
          style={[
            styles.addNode,
            addStyle,
            {
              backgroundColor: colors.card,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <AppIcon name="plus" size={24} color={colors.primary} />
        </Animated.View>
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
