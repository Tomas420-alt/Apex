import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface CTAButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  arrow?: boolean;
  style?: ViewStyle;
}

export function CTAButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  arrow = false,
  style,
}: CTAButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.97, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    onPress();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          isPrimary ? styles.primary : styles.secondary,
          disabled && styles.disabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={disabled}
      >
        {arrow && (
          <ChevronRight size={18} color={isPrimary ? '#FFFFFF' : colors.green} style={styles.arrowLeft} />
        )}
        <Text style={[styles.label, !isPrimary && styles.labelSecondary]}>
          {label}
        </Text>
        {arrow && (
          <ChevronRight size={18} color={isPrimary ? '#FFFFFF' : colors.green} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: colors.green,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  labelSecondary: {
    color: colors.green,
  },
  arrowLeft: {
    opacity: 0, // invisible spacer to keep text centered
  },
});
