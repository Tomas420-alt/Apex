import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
      <View style={styles.iconBox}>
        {icon}
      </View>
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, { color }]}>{value}</Text>
      </View>
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
    <View style={styles.card}>
      {/* Rows */}
      <View style={styles.rowsContainer}>
          <Row
            icon={<TrendingUp size={14} color="#22c55e" strokeWidth={2} />}
            label="Labor saved so far"
            value={`${currency}${Math.round(savedThisYear)}`}
            color="#22c55e"
          />
          <View style={styles.divider} />
          <Row
            icon={<Calendar size={14} color="#22c55e" strokeWidth={2} />}
            label="Projected savings by year end"
            value={`${currency}${Math.round(projectedSavings)}`}
            color="#22c55e"
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
        </View>

      {/* Bottom accent line */}
      <View style={styles.accentLineTrack}>
        <View style={styles.accentLineFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
  },
  card: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  rowsContainer: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowTextBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  accentLineTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  accentLineFill: {
    width: '30%',
    height: '100%',
    borderRadius: 1,
    backgroundColor: '#22c55e',
    opacity: 0.6,
  },
});
