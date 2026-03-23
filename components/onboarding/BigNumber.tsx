import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface BigNumberProps {
  number: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  animated?: boolean;
  duration?: number;
  delay?: number;
  size?: 'large' | 'medium';
}

export function BigNumber({
  number,
  prefix = '',
  suffix = '',
  color = colors.green,
  animated = true,
  duration = 1200,
  delay = 0,
  size = 'large',
}: BigNumberProps) {
  const [display, setDisplay] = useState(animated ? 0 : number);

  useEffect(() => {
    if (!animated) {
      setDisplay(number);
      return;
    }

    const startTime = Date.now() + delay;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) return;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * number));
      if (t >= 1) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [number, animated, duration, delay]);

  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      <Text style={[
        isLarge ? styles.numberLarge : styles.numberMedium,
        { color },
      ]}>
        {prefix}{display.toLocaleString()}{suffix && (
          <Text style={[isLarge ? styles.suffixLarge : styles.suffixMedium, { color }]}>
            {suffix}
          </Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  numberLarge: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 72,
  },
  numberMedium: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  suffixLarge: {
    fontSize: 28,
    fontWeight: '600',
  },
  suffixMedium: {
    fontSize: 20,
    fontWeight: '600',
  },
});
