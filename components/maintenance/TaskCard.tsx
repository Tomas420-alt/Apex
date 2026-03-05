import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle, Wrench, Bike, ChevronRight, CheckCircle } from 'lucide-react-native';
import { Id } from '../../convex/_generated/dataModel';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#991B1B' },
  high: { bg: '#FED7AA', text: '#9A3412' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  low: { bg: '#E5E7EB', text: '#4B5563' },
};

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

export function TaskCard({ task, bikeName, onPress, onComplete, isCompleting, currency }: TaskCardProps) {
  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;
  const isOverdue = task.status === 'overdue';

  const partsCost = task.estimatedCostUsd ?? 0;
  const laborCost = task.estimatedLaborCostUsd ?? 0;
  const shopCost = partsCost + laborCost;
  const hasCostData = partsCost > 0 || laborCost > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isOverdue && styles.cardOverdue,
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
              isOverdue ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#F0FDF4' },
            ]}
          >
            {isOverdue ? (
              <AlertTriangle size={18} color="#EF4444" strokeWidth={2} />
            ) : (
              <Wrench size={18} color="#10B981" strokeWidth={2} />
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
            <View style={styles.bikeRow}>
              <Bike size={11} color="#9CA3AF" />
              <Text style={styles.bikeName}>{bikeName}</Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
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
        {task.dueDate ? (
          <Text style={styles.metaText}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
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
          <ActivityIndicator size={14} color="#10B981" />
        ) : (
          <CheckCircle size={14} color="#10B981" strokeWidth={2} />
        )}
        <Text style={styles.completeButtonText}>Mark Complete</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  cardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
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
    color: '#1F2937',
    lineHeight: 20,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bikeName: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#6B7280',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#E5E7EB',
  },
  costLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  costValueGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  costValueGray: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  costValueSave: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
});
