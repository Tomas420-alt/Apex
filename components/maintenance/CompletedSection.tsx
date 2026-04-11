import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Bike } from 'lucide-react-native';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

interface CompletedTask {
  _id: string;
  name: string;
  completedAt?: number;
  estimatedLaborCostUsd?: number;
  bikeName: string;
}

interface CompletedSectionProps {
  tasks: CompletedTask[];
  currency: string;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function CompletedSection({ tasks, currency }: CompletedSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <CheckCircle size={16} color={colors.green} strokeWidth={2} />
        <Text style={styles.sectionTitle}>Recently Completed</Text>
      </View>
      {tasks.map((task) => {
        const saved = task.estimatedLaborCostUsd ?? 0;
        return (
          <View key={task._id} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.taskName} numberOfLines={1}>{task.name}</Text>
              <View style={styles.subRow}>
                <Bike size={10} color={colors.textTertiary} />
                <Text style={styles.subText}>{task.bikeName}</Text>
                {task.completedAt ? (
                  <Text style={styles.subText}>{timeAgo(task.completedAt)}</Text>
                ) : null}
              </View>
            </View>
            {saved > 0 ? (
              <View style={styles.savedBadge}>
                <Text style={styles.savedText}>{currency}{Math.round(saved)} saved</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,229,153,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,229,153,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
    marginRight: 10,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  savedBadge: {
    backgroundColor: 'rgba(0,229,153,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
});
