import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface StatCardProps {
  value: string;
  label: string;
  color?: string;
  trend?: 'up' | 'down';
}

export function StatCard({
  value,
  label,
  color = colors.red,
  trend = 'up',
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <View style={styles.card}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <TrendIcon size={20} color={color} style={styles.trendIcon} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  trendIcon: {
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
