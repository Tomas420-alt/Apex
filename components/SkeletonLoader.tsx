import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface SkeletonLineProps {
  width: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonLine({ width, height = 12, borderRadius = 6, style }: SkeletonLineProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.08)',
        },
        animStyle,
        style,
      ]}
    />
  );
}

/** Skeleton that mimics an inspection checklist item */
export function InspectionSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.headerRow}>
        <SkeletonLine width={20} height={20} borderRadius={4} />
        <SkeletonLine width={140} height={16} />
        <View style={{ flex: 1 }} />
        <SkeletonLine width={36} height={20} borderRadius={10} />
      </View>
      <SkeletonLine width="90%" height={10} style={{ marginTop: 8 }} />
      <SkeletonLine width="70%" height={10} style={{ marginTop: 6 }} />

      {/* Skeleton items */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.itemRow}>
          <SkeletonLine width={32} height={32} borderRadius={8} />
          <View style={styles.itemText}>
            <SkeletonLine width={`${65 + (i % 3) * 10}%`} height={14} />
            <SkeletonLine width={`${45 + (i % 2) * 20}%`} height={10} style={{ marginTop: 6 }} />
          </View>
          <SkeletonLine width={24} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton that mimics the new borderLeft task cards with 12px gap */
export function PlanGenerationSkeletonLoader() {
  return (
    <View style={styles.planContainer}>
      {/* Task card skeletons — match borderLeft card style */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.taskCard}>
          {/* Title line */}
          <SkeletonLine width={`${50 + (i % 3) * 15}%`} height={12} />
          {/* Subtitle line (date + price + parts) */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <SkeletonLine width={52} height={11} />
            <SkeletonLine width={32} height={11} />
            {i % 2 === 0 && <SkeletonLine width={44} height={11} />}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton that mimics the parts list screen layout */
export function PartsListSkeletonLoader() {
  return (
    <View style={styles.partsContainer}>
      {/* Summary bar skeleton */}
      <View style={styles.partsSummary}>
        <SkeletonLine width={100} height={14} />
        <SkeletonLine width={60} height={14} />
      </View>

      {/* Part row skeletons */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.partRow}>
          {/* Checkbox */}
          <SkeletonLine width={22} height={22} borderRadius={11} />
          {/* Part info */}
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonLine width={`${55 + (i % 3) * 15}%`} height={13} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {i % 2 === 0 && <SkeletonLine width={60} height={10} />}
              <SkeletonLine width={48} height={10} />
            </View>
          </View>
          {/* Price */}
          <SkeletonLine width={40} height={13} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  // Plan task card skeletons — matches borderLeft card style
  planContainer: {
    gap: 12,
    marginTop: 12,
    marginBottom: 24,
  },
  taskCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 16,
  },
  // Parts list skeletons
  partsContainer: {
    gap: 4,
    paddingVertical: 8,
  },
  partsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
});
