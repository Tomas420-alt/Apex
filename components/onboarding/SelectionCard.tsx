import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface SelectionCardProps {
  label: string;
  value: string;
  selected?: boolean;
  onPress: (value: string) => void;
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  trailingText?: string;
}

export function SelectionCard({
  label,
  value,
  selected,
  onPress,
  icon: Icon,
  iconColor,
  subtitle,
  trailingText,
}: SelectionCardProps) {
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

  const resolvedIconColor = selected ? colors.green : (iconColor || colors.textSecondary);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.card,
          selected && styles.cardSelected,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {Icon ? (
          <View style={[styles.iconWrapper, selected && styles.iconWrapperSelected]}>
            <Icon size={18} color={resolvedIconColor} />
          </View>
        ) : null}

        <View style={styles.textContainer}>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>

        {trailingText ? (
          <Text style={[styles.trailing, selected && styles.trailingSelected]}>
            {trailingText}
          </Text>
        ) : null}

        {selected ? (
          <View style={styles.checkCircle}>
            <Check size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: colors.green,
    backgroundColor: 'rgba(0,242,255,0.08)',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconWrapperSelected: {
    backgroundColor: 'rgba(0,242,255,0.12)',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.green,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  trailing: {
    fontSize: 13,
    color: colors.textTertiary,
    marginLeft: 8,
    fontWeight: '500',
  },
  trailingSelected: {
    color: colors.green,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
