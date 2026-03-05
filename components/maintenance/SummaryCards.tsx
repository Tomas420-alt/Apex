import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react-native';
import { CurrencyIcon } from '../CurrencyIcon';

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.card, { borderTopColor: '#EF4444' }]}>
        <View style={[styles.icon, { backgroundColor: '#FEE2E2' }]}>
          <AlertTriangle size={20} color="#EF4444" strokeWidth={2} />
        </View>
        <Text style={styles.count}>{overdueCount}</Text>
        <Text style={styles.label}>Overdue</Text>
      </View>

      <View style={[styles.card, { borderTopColor: '#F59E0B' }]}>
        <View style={[styles.icon, { backgroundColor: '#FEF3C7' }]}>
          <Clock size={20} color="#F59E0B" strokeWidth={2} />
        </View>
        <Text style={styles.count}>{dueCount}</Text>
        <Text style={styles.label}>Due Soon</Text>
      </View>

      <View style={[styles.card, { borderTopColor: '#10B981' }]}>
        <View style={[styles.icon, { backgroundColor: '#D1FAE5' }]}>
          <CheckCircle size={20} color="#10B981" strokeWidth={2} />
        </View>
        <Text style={styles.count}>{completedCount}</Text>
        <Text style={styles.label}>Completed</Text>
      </View>

      <View style={[styles.card, { borderTopColor: '#10B981' }]}>
        <View style={[styles.icon, { backgroundColor: '#D1FAE5' }]}>
          <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={20} color="#10B981" />
        </View>
        <Text style={[styles.count, { color: '#10B981' }]}>
          {currency}{Math.round(totalSavings)}
        </Text>
        <Text style={styles.label}>Saved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 3,
    padding: 16,
    width: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  count: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
