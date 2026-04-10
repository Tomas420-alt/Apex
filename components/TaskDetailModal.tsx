import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Calendar,
  Gauge,
  RefreshCw,
  Package,
  CheckCircle2,
  CircleDot,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { getCurrencySymbol, getCurrencyIconName } from '../utils/currency';
import { CurrencyIcon } from './CurrencyIcon';
import { Id } from '../convex/_generated/dataModel';

interface TaskData {
  _id: Id<'maintenanceTasks'>;
  name: string;
  description?: string;
  priority: string;
  status: string;
  intervalKm?: number;
  intervalMonths?: number;
  estimatedCostUsd?: number;
  dueDate?: string;
  dueMileage?: number;
  partsNeeded?: string[];
}

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'due' | 'overdue' | 'completed' | 'skipped';

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; label: string }> = {
  critical: { bg: colors.priority.critical.bg, text: colors.priority.critical.text, label: 'Critical' },
  high: { bg: colors.priority.high.bg, text: colors.priority.high.text, label: 'High' },
  medium: { bg: colors.priority.medium.bg, text: colors.priority.medium.text, label: 'Medium' },
  low: { bg: colors.priority.low.bg, text: colors.priority.low.text, label: 'Low' },
};

const STATUS_CONFIG: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: colors.status.pending.bg, text: colors.status.pending.text, label: 'Pending' },
  due: { bg: colors.status.due.bg, text: colors.status.due.text, label: 'Due' },
  overdue: { bg: colors.status.overdue.bg, text: colors.status.overdue.text, label: 'Overdue' },
  completed: { bg: colors.status.completed.bg, text: colors.status.completed.text, label: 'Done' },
  skipped: { bg: colors.status.skipped.bg, text: colors.status.skipped.text, label: 'Skipped' },
};

interface Props {
  task: TaskData | null;
  onClose: () => void;
  currency: string;
  country?: string;
  /** Show "View Parts" button */
  onViewParts?: (taskId: Id<'maintenanceTasks'>, taskName: string) => void;
  /** Show "Mark Complete" button */
  onComplete?: (taskId: Id<'maintenanceTasks'>) => void;
  completingTaskId?: Id<'maintenanceTasks'> | null;
  isSubscribed?: boolean;
}

export function TaskDetailModal({
  task,
  onClose,
  currency,
  country,
  onViewParts,
  onComplete,
  completingTaskId,
  isSubscribed,
}: Props) {
  const currencyIconName = getCurrencyIconName(country);

  return (
    <Modal visible={task !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
        <Pressable style={{ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: '#1f2937', width: '90%', maxWidth: 400, overflow: 'hidden' }} onPress={() => {}}>
          <BlurView intensity={15} tint="dark" style={{ backgroundColor: 'transparent', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 14 }}>
            {task && (() => {
              const pri = (task.priority as Priority) in PRIORITY_CONFIG ? (task.priority as Priority) : 'low';
              const stat = (task.status as TaskStatus) in STATUS_CONFIG ? (task.status as TaskStatus) : 'pending';
              const pCfg = PRIORITY_CONFIG[pri];
              const sCfg = STATUS_CONFIG[stat];
              const isDone = stat === 'completed';
              const showStatus = stat !== 'pending';
              return (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 3, borderRadius: 1.5, alignSelf: 'stretch', backgroundColor: pCfg.text }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, lineHeight: 22 }}>{task.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: pCfg.bg }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: pCfg.text }}>{pCfg.label}</Text>
                        </View>
                        {showStatus && (
                          <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: sCfg.bg }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sCfg.text }}>{sCfg.label}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {task.description && <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{task.description}</Text>}
                  <View>
                    {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <Calendar size={13} color={colors.textTertiary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Due</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</Text>
                      </View>
                    )}
                    {task.dueMileage ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <Gauge size={13} color={colors.textTertiary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Mileage</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{task.dueMileage.toLocaleString()} km</Text>
                      </View>
                    ) : null}
                    {(task.intervalKm || task.intervalMonths) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <RefreshCw size={13} color={colors.textTertiary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Interval</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                          {[task.intervalKm ? `${task.intervalKm.toLocaleString()} km` : null, task.intervalMonths ? `${task.intervalMonths} mo` : null].filter(Boolean).join(' / ')}
                        </Text>
                      </View>
                    ) : null}
                    {task.estimatedCostUsd ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                        <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={13} color={colors.textTertiary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Est. Cost</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.green }}>{currency}{task.estimatedCostUsd.toFixed(0)}</Text>
                      </View>
                    ) : null}
                  </View>
                  {task.partsNeeded && task.partsNeeded.length > 0 && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Parts Needed</Text>
                      {task.partsNeeded.map((part, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
                          <CircleDot size={8} color={colors.textTertiary} />
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{part}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    {isSubscribed && onViewParts && task.partsNeeded && task.partsNeeded.length > 0 && (
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(91,141,239,0.2)', borderRadius: 10, borderCurve: 'continuous', paddingVertical: 12, backgroundColor: 'rgba(91,141,239,0.1)' }}
                        onPress={() => { onClose(); onViewParts(task._id, task.name); }}
                        activeOpacity={0.7}
                      >
                        <Package size={14} color={colors.blue} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.blue }}>View Parts</Text>
                      </TouchableOpacity>
                    )}
                    {onComplete && !isDone && (
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.green, borderRadius: 10, borderCurve: 'continuous', paddingVertical: 12, opacity: completingTaskId === task._id ? 0.5 : 1 }}
                        onPress={() => { onComplete(task._id); onClose(); }}
                        activeOpacity={0.7}
                        disabled={completingTaskId === task._id}
                      >
                        <CheckCircle2 size={14} color="#000000" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#000000' }}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
