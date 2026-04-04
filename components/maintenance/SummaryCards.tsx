import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/theme';

export type MetricTab = 'upcoming' | 'overdue' | 'done' | 'saved';

interface SummaryCardsProps {
  overdueCount: number;
  dueCount: number;
  completedCount: number;
  totalSavings: number;
  currency: string;
  currencyIconName: string | null;
  completedProgress?: number;
  savingsProgress?: number;
  activeTab: MetricTab;
  onTabPress: (tab: MetricTab) => void;
}

function Cell({ value, label, accentColor, progress, isActive, onPress }: {
  value: string;
  label: string;
  accentColor: string;
  progress: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={0.6}>
      <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, isActive && { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: accentColor,
              width: `${Math.max(progress * 100, 8)}%` as any,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

export function SummaryCards({
  overdueCount,
  dueCount,
  completedCount,
  totalSavings,
  currency,
  currencyIconName,
  completedProgress,
  savingsProgress,
  activeTab,
  onTabPress,
}: SummaryCardsProps) {
  const total = overdueCount + dueCount + completedCount || 1;

  return (
    <View style={styles.strip}>
      <Cell
        value={String(overdueCount)}
        label="OVERDUE"
        accentColor={colors.red}
        progress={overdueCount / total}
        isActive={activeTab === 'overdue'}
        onPress={() => onTabPress('overdue')}
      />
      <Cell
        value={String(dueCount)}
        label="UPCOMING"
        accentColor={colors.green}
        progress={dueCount / total}
        isActive={activeTab === 'upcoming'}
        onPress={() => onTabPress('upcoming')}
      />
      <Cell
        value={String(completedCount)}
        label="DONE"
        accentColor={colors.textPrimary}
        progress={completedProgress ?? (completedCount / total)}
        isActive={activeTab === 'done'}
        onPress={() => onTabPress('done')}
      />
      <Cell
        value={`${currency}${Math.round(totalSavings)}`}
        label="SAVED"
        accentColor="#22c55e"
        progress={savingsProgress ?? (totalSavings > 0 ? 1 : 0.08)}
        isActive={activeTab === 'saved'}
        onPress={() => onTabPress('saved')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 0,
    marginHorizontal: -4,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.textTertiary,
  },
  barTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 1,
  },
});
