import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const SEGMENTS = [
  { label: 'About You', startStep: 1, endStep: 5 },
  { label: 'Your Riding', startStep: 6, endStep: 10 },
  { label: 'Your Bike', startStep: 11, endStep: 14 },
  { label: 'Analysis', startStep: 15, endStep: 17 },
  { label: 'Your Plan', startStep: 18, endStep: 20 },
];

interface ProgressBarProps {
  step: number;
  totalSteps?: number;
}

function SegmentBar({ fillPercent }: { fillPercent: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(fillPercent, { duration: 400 });
  }, [fillPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.segmentTrack}>
      <Animated.View style={[styles.segmentFill, fillStyle]} />
    </View>
  );
}

export function ProgressBar({ step }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.segmentsRow}>
        {SEGMENTS.map((seg) => {
          let fillPercent = 0;
          if (step >= seg.endStep) {
            fillPercent = 100;
          } else if (step >= seg.startStep) {
            const range = seg.endStep - seg.startStep + 1;
            const progress = step - seg.startStep + 1;
            fillPercent = (progress / range) * 100;
          }
          return <SegmentBar key={seg.label} fillPercent={fillPercent} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  segmentTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 2,
  },
});
