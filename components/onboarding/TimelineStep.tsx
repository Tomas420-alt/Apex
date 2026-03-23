import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface TimelineStepProps {
  month: string;
  title: string;
  description: string;
  isLast?: boolean;
  color?: string;
}

export function TimelineStep({
  month,
  title,
  description,
  isLast = false,
  color = colors.green,
}: TimelineStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.lineColumn}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        {!isLast && (
          <View style={[styles.line, { backgroundColor: `${color}30` }]} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.month, { color }]}>{month}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  lineColumn: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 28,
    paddingLeft: 12,
  },
  month: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
