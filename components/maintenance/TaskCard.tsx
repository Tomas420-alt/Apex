import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle, Wrench, Bike, ChevronRight, CheckCircle } from 'lucide-react-native';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

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
  bikeName: string;
  onPress: () => void;
  onComplete: (id: Id<'maintenanceTasks'>) => void;
  isCompleting: boolean;
  currency: string;
}

const PRIORITY_ICON_COLORS: Record<string, { icon: string; bg: string }> = {
  critical: { icon: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  high: { icon: '#FF9F43', bg: 'rgba(255,159,67,0.12)' },
  medium: { icon: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
  low: { icon: '#8E8EA0', bg: 'rgba(142,142,160,0.12)' },
};

export function TaskCard({ task, bikeName, onPress, onComplete, isCompleting, currency }: TaskCardProps) {
  const priorityStyle = colors.priority[task.priority] || colors.priority.low;
  const isOverdue = task.status === 'overdue';
  const iconColors = PRIORITY_ICON_COLORS[task.priority] || PRIORITY_ICON_COLORS.low;

  const partsCost = task.estimatedCostUsd ?? 0;
  const laborCost = task.estimatedLaborCostUsd ?? 0;
  const shopCost = partsCost + laborCost;
  const hasCostData = partsCost > 0 || laborCost > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderLeftWidth: 3, borderLeftColor: iconColors.icon },
        pressed && { opacity: 0.95 },
      ]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColors.bg },
            ]}
          >
            {isOverdue ? (
              <AlertTriangle size={18} color={iconColors.icon} strokeWidth={2} />
            ) : (
              <Wrench size={18} color={iconColors.icon} strokeWidth={2} />
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
            <View style={styles.bikeRow}>
              <Bike size={11} color={colors.textTertiary} />
              <Text style={styles.bikeName}>{bikeName}</Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
      </View>

      {/* Description */}
      {task.description ? (
        <Text style={styles.description} numberOfLines={2}>{task.description}</Text>
      ) : null}

      {/* Meta row: priority + due info */}
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.badgeText, { color: priorityStyle.text }]}>{task.priority}</Text>
        </View>
        {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) ? (
          <Text style={styles.metaText}>Due: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</Text>
        ) : null}
        {task.dueMileage ? (
          <Text style={styles.metaText}>{task.dueMileage.toLocaleString()} km</Text>
        ) : null}
      </View>

      {/* Cost breakdown */}
      {hasCostData ? (
        <View style={styles.costRow}>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>DIY</Text>
            <Text style={styles.costValueGreen}>{currency}{Math.round(partsCost)}</Text>
          </View>
          {laborCost > 0 ? (
            <>
              <View style={styles.costDivider} />
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>Shop</Text>
                <Text style={styles.costValueGray}>{currency}{Math.round(shopCost)}</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>You save</Text>
                <Text style={styles.costValueSave}>{currency}{Math.round(laborCost)}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Complete button */}
      <Pressable
        style={({ pressed }) => [
          styles.completeButton,
          pressed && { opacity: 0.7 },
          isCompleting && { opacity: 0.6 },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onComplete(task._id);
        }}
        disabled={isCompleting}
      >
        {isCompleting ? (
          <ActivityIndicator size={14} color={colors.green} />
        ) : (
          <CheckCircle size={14} color={colors.green} strokeWidth={2} />
        )}
        <Text style={styles.completeButtonText}>Mark Complete</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bikeName: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  costItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  costDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  costLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  costValueGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
  },
  costValueGray: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  costValueSave: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,229,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,153,0.2)',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.green,
  },
});
