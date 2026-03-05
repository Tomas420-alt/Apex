import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

// ─── Custom Sparkles with orbiting secondary stars ───────────────────────────

function AnimatedSparkles({
  size,
  color,
  isAnimating,
}: {
  size: number;
  color: string;
  isAnimating: boolean;
}) {
  const progress = useSharedValue(0);
  const scale = size / 24;

  // Orbit geometry (24×24 SVG viewBox)
  // Main star center ≈ (12, 12)
  // Top-right cross center = (20, 4) → angle = atan2(4-12, 20-12) = -π/4
  // Bottom-left dot center = (4, 20) → angle = atan2(20-12, 4-12) = 3π/4
  // Both are at distance √((8²+8²)) ≈ 11.31 from center
  const CX = 12;
  const CY = 12;
  const RADIUS = Math.sqrt(128);
  const TR_ANGLE = Math.atan2(4 - CY, 20 - CX); // ≈ -0.785 rad
  const BL_ANGLE = Math.atan2(20 - CY, 4 - CX); // ≈  2.356 rad

  useEffect(() => {
    if (isAnimating) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      // Spring back to original position
      progress.value = withSpring(0, { damping: 14, stiffness: 120 });
    }
  }, [isAnimating]);

  // Top-right cross: orbit from its starting angle
  const topRightStyle = useAnimatedStyle(() => {
    const angle = TR_ANGLE + progress.value * 2 * Math.PI;
    return {
      transform: [
        { translateX: (CX + RADIUS * Math.cos(angle) - 20) * scale },
        { translateY: (CY + RADIUS * Math.sin(angle) - 4) * scale },
      ],
    };
  });

  // Bottom-left dot: orbit from its starting angle
  const bottomLeftStyle = useAnimatedStyle(() => {
    const angle = BL_ANGLE + progress.value * 2 * Math.PI;
    return {
      transform: [
        { translateX: (CX + RADIUS * Math.cos(angle) - 4) * scale },
        { translateY: (CY + RADIUS * Math.sin(angle) - 20) * scale },
      ],
    };
  });

  const sw = 2;

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      {/* Main star — always static */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Top-right sparkle (+) — orbits during loading */}
      <Animated.View style={[StyleSheet.absoluteFill, topRightStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M20 2v4" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M22 4h-4" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Bottom-left sparkle (dot) — orbits during loading */}
      <Animated.View style={[StyleSheet.absoluteFill, bottomLeftStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="4" cy="20" r="2" stroke={color} strokeWidth={sw} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── GenerateButton ──────────────────────────────────────────────────────────

interface GenerateButtonProps {
  label: string;
  loadingLabel: string;
  onPress: () => void;
  isLoading: boolean;
  disabled?: boolean;
  variant: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function GenerateButton({
  label,
  loadingLabel,
  onPress,
  isLoading,
  disabled = false,
  variant,
  style,
}: GenerateButtonProps) {
  const isPrimary = variant === 'primary';
  const iconSize = isPrimary ? 18 : 14;
  const iconColor = isPrimary ? '#FFFFFF' : colors.textSecondary;

  // Subtle button breathing while loading
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(buttonScale);
      buttonScale.value = withTiming(1, { duration: 300 });
    }
  }, [isLoading]);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View style={[buttonAnimStyle, style]}>
      <TouchableOpacity
        style={[
          isPrimary ? styles.primaryButton : styles.secondaryButton,
          (isLoading || disabled) && styles.disabledButton,
        ]}
        onPress={onPress}
        activeOpacity={0.85}
        disabled={isLoading || disabled}
      >
        <AnimatedSparkles
          size={iconSize}
          color={iconColor}
          isAnimating={isLoading}
        />
        <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>
          {isLoading ? loadingLabel : label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    overflow: 'visible',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    overflow: 'visible',
    backgroundColor: colors.surface1,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
