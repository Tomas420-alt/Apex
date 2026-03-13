import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}

export function HealthScoreRing({
  score,
  size = 200,
  strokeWidth = 12,
  delay = 0,
}: HealthScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [displayScore, setDisplayScore] = useState(0);

  const progress = useSharedValue(0);

  useEffect(() => {
    // Animate the score number via a JS interval
    const duration = 1500;
    const startTime = Date.now() + delay;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) return;
      const t = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(t * score));
      if (t >= 1) clearInterval(interval);
    }, 16);

    progress.value = withDelay(
      delay,
      withTiming(score / 100, { duration })
    );

    return () => clearInterval(interval);
  }, [score, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const scoreColor =
    score > 70 ? colors.green : score >= 45 ? colors.orange : colors.red;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerText}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {displayScore}
        </Text>
        <Text style={styles.maxText}>/100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
  },
  maxText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: -4,
  },
});
