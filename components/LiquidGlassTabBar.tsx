import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

function TabItem({
  route,
  descriptor,
  navigation,
  isFocused,
}: {
  route: BottomTabBarProps['state']['routes'][0];
  descriptor: BottomTabBarProps['descriptors'][string];
  navigation: BottomTabBarProps['navigation'];
  isFocused: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 1 : 0.5);
  const glowOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isFocused ? 1 : 0.45, { duration: 250 });
    glowOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 300 });
    if (isFocused) {
      scale.value = withSpring(1.1, SPRING_CONFIG);
    } else {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const { options } = descriptor;
  const label = options.title ?? route.name;

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      {/* Active glow beneath icon */}
      <Animated.View style={[styles.activeGlow, glowStyle]}>
        <LinearGradient
          colors={['rgba(0, 229, 153, 0.25)', 'rgba(0, 229, 153, 0)']}
          style={styles.glowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={iconStyle}>
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
          size: 22,
        })}
      </Animated.View>

      <Animated.Text
        style={[
          styles.label,
          isFocused && styles.labelActive,
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      {/* Active indicator dot */}
      {isFocused && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

export default function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      {/* Outer glow / shadow layer */}
      <View style={styles.outerGlow} />

      {/* Glass container */}
      <View style={styles.container}>
        {/* Blur layer */}
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        {/* Glass gradient overlay */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.08)',
            'rgba(255, 255, 255, 0.02)',
            'rgba(255, 255, 255, 0.05)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Inner highlight (top edge light refraction) */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topHighlight}
        />

        {/* Tab items */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const isFocused = state.index === index;

            return (
              <TabItem
                key={route.key}
                route={route}
                descriptor={descriptor}
                navigation={navigation}
                isFocused={isFocused}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  outerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    shadowColor: '#00E599',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 0,
  },
  container: {
    width: '100%',
    height: 68,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E599',
    shadowColor: '#00E599',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
