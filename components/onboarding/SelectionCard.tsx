import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface SelectionCardProps {
  label: string;
  value: string;
  selected?: boolean;
  onPress: (value: string) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SelectionCard({ label, value, selected, onPress }: SelectionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.96, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    onPress(value);
  };

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        selected && styles.cardSelected,
        animatedStyle,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: colors.green,
    backgroundColor: 'rgba(0,229,153,0.08)',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.green,
  },
});
