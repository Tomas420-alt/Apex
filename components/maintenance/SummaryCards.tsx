import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react-native';
import { CurrencyIcon } from '../CurrencyIcon';
import { colors } from '@/constants/theme';

interface SummaryCardsProps {
  overdueCount: number;
  dueCount: number;
  completedCount: number;
  totalSavings: number;
  currency: string;
  currencyIconName: string | null;
}

export function SummaryCards({
  overdueCount,
  dueCount,
  completedCount,
  totalSavings,
  currency,
  currencyIconName,
}: SummaryCardsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.card, { borderLeftColor: colors.red }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
            <AlertTriangle size={18} color={colors.red} strokeWidth={2} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.count}>{overdueCount}</Text>
            <Text style={styles.label}>Overdue</Text>
          </View>
        </View>

        <View style={[styles.card, { borderLeftColor: colors.orange }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(255,159,67,0.12)' }]}>
            <Clock size={18} color={colors.orange} strokeWidth={2} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.count}>{dueCount}</Text>
            <Text style={styles.label}>Due Soon</Text>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, { borderLeftColor: colors.green }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(0,229,153,0.12)' }]}>
            <CheckCircle size={18} color={colors.green} strokeWidth={2} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.count}>{completedCount}</Text>
            <Text style={styles.label}>Completed</Text>
          </View>
        </View>

        <View style={[styles.card, { borderLeftColor: colors.green }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(0,229,153,0.12)' }]}>
            <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={18} color={colors.green} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.count, { color: colors.green }]}>
              {currency}{Math.round(totalSavings)}
            </Text>
            <Text style={styles.label}>Saved</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: 14,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
});
