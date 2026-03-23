import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { TrendingUp, Wrench, DollarSign, Calendar } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface SavingsBreakdownProps {
  savedThisYear: number;
  projectedSavings: number;
  partsSpentThisYear: number;
  projectedPartsCost: number;
  mechanicCostThisYear: number;
  currency: string;
}

function Row({ label, value, color, icon }: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

export function SavingsBreakdown({
  savedThisYear,
  projectedSavings,
  partsSpentThisYear,
  projectedPartsCost,
  mechanicCostThisYear,
  currency,
}: SavingsBreakdownProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Savings Breakdown</Text>
      <Text style={styles.subtitle}>{new Date().getFullYear()} year-to-date</Text>

      <View style={styles.cardOuter}>
        <BlurView intensity={25} tint="dark" style={styles.card}>
          <Row
            icon={<TrendingUp size={14} color={colors.green} strokeWidth={2} />}
            label="Labor saved so far"
            value={`${currency}${Math.round(savedThisYear)}`}
            color={colors.green}
          />
          <View style={styles.divider} />
          <Row
            icon={<Calendar size={14} color={colors.green} strokeWidth={2} />}
            label="Projected savings by year end"
            value={`${currency}${Math.round(projectedSavings)}`}
            color={colors.green}
          />
          <View style={styles.divider} />
          <Row
            icon={<Wrench size={14} color={colors.textSecondary} strokeWidth={2} />}
            label="Parts spent so far"
            value={`${currency}${Math.round(partsSpentThisYear)}`}
            color={colors.textPrimary}
          />
          <View style={styles.divider} />
          <Row
            icon={<Wrench size={14} color={colors.textTertiary} strokeWidth={2} />}
            label="Projected parts cost (full year)"
            value={`${currency}${Math.round(projectedPartsCost)}`}
            color={colors.textSecondary}
          />
          <View style={styles.divider} />
          <Row
            icon={<DollarSign size={14} color={colors.red} strokeWidth={2} />}
            label="Mechanic would charge (full year)"
            value={`${currency}${Math.round(mechanicCostThisYear)}`}
            color={colors.red}
          />
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  cardOuter: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(26,26,46,0.5)',
  },
  card: {
    padding: 16,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
