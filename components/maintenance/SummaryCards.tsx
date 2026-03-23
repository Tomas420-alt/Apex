import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react-native';
import { CurrencyIcon } from '../CurrencyIcon';
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

function Cell({ icon, value, label, accentColor, progress, isActive, onPress }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accentColor: string;
  progress: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.cellTop}>
        {icon}
        <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: isActive ? accentColor : accentColor,
              width: `${Math.max(progress * 100, 8)}%` as any,
            },
          ]}
        />
      </View>
      <Text style={[styles.label, isActive && { color: colors.textPrimary }]}>{label}</Text>
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
        icon={<AlertTriangle size={16} color={colors.red} strokeWidth={1.8} />}
        value={String(overdueCount)}
        label="Overdue"
        accentColor={colors.red}
        progress={overdueCount / total}
        isActive={activeTab === 'overdue'}
        onPress={() => onTabPress('overdue')}
      />
      <View style={styles.divider} />
      <Cell
        icon={<Clock size={16} color={colors.orange} strokeWidth={1.8} />}
        value={String(dueCount)}
        label="Upcoming"
        accentColor={colors.orange}
        progress={dueCount / total}
        isActive={activeTab === 'upcoming'}
        onPress={() => onTabPress('upcoming')}
      />
      <View style={styles.divider} />
      <Cell
        icon={<CheckCircle size={16} color={colors.green} strokeWidth={1.8} />}
        value={String(completedCount)}
        label="Done"
        accentColor={colors.green}
        progress={completedProgress ?? (completedCount / total)}
        isActive={activeTab === 'done'}
        onPress={() => onTabPress('done')}
      />
      <View style={styles.divider} />
      <Cell
        icon={<View style={{ marginRight: -3 }}><CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={16} color={colors.green} strokeWidth={1.8} /></View>}
        value={String(Math.round(totalSavings))}
        label="Saved"
        accentColor={colors.green}
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
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  cellTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
  barTrack: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
