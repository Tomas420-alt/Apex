import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertTriangle, Wrench } from 'lucide-react-native';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

// Country → locale map for date formatting
const COUNTRY_LOCALES: Record<string, string> = {
  'Ireland': 'en-IE',
  'United Kingdom': 'en-GB',
  'Australia': 'en-AU',
  'United States': 'en-US',
  'Canada': 'en-CA',
  'Germany': 'de-DE',
  'France': 'fr-FR',
  'Italy': 'it-IT',
  'Spain': 'es-ES',
  'Japan': 'ja-JP',
  'Brazil': 'pt-BR',
  'India': 'en-IN',
  'New Zealand': 'en-NZ',
  'South Africa': 'en-ZA',
  'Netherlands': 'nl-NL',
};

function formatDate(dateStr: string, country?: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const locale = (country && COUNTRY_LOCALES[country]) || undefined;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface TaskCardProps {
  task: {
    _id: Id<'maintenanceTasks'>;
    name: string;
    description?: string;
    priority: string;
    status: string;
    dueDate?: string;
    dueMileage?: number;
    estimatedCostUsd?: number;
    estimatedLaborCostUsd?: number;
  };
  onPress: () => void;
  country?: string;
  currency: string;
}

const PRIORITY_ICON_COLORS: Record<string, { icon: string; bg: string }> = {
  critical: { icon: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  high: { icon: '#FF9F43', bg: 'rgba(255,159,67,0.12)' },
  medium: { icon: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
  low: { icon: '#8E8EA0', bg: 'rgba(142,142,160,0.12)' },
};

export function TaskCard({ task, onPress, country, currency }: TaskCardProps) {
  const priorityStyle = colors.priority[task.priority] || colors.priority.low;
  const isOverdue = task.status === 'overdue';
  const iconColors = PRIORITY_ICON_COLORS[task.priority] || PRIORITY_ICON_COLORS.low;

  const partsCost = task.estimatedCostUsd ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardOuter,
        { borderLeftWidth: 3, borderLeftColor: iconColors.icon },
        pressed && { opacity: 0.95 },
      ]}
      onPress={onPress}
    >
      <BlurView intensity={25} tint="dark" style={styles.card}>
        {/* Single row: icon + name + meta */}
        <View style={styles.row}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColors.bg },
            ]}
          >
            {isOverdue ? (
              <AlertTriangle size={16} color={iconColors.icon} strokeWidth={2} />
            ) : (
              <Wrench size={16} color={iconColors.icon} strokeWidth={2} />
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.taskName} numberOfLines={1}>{task.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                <Text style={[styles.badgeText, { color: priorityStyle.text }]}>{task.priority}</Text>
              </View>
              {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) ? (
                <Text style={styles.metaText}>{formatDate(task.dueDate, country)}</Text>
              ) : null}
              {partsCost > 0 ? (
                <Text style={styles.costText}>{currency}{Math.round(partsCost)}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  costText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
});
