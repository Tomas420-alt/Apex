import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Wrench,
  Calendar,
  Gauge,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  CircleDot,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Plus,
  Shield,
  ChevronDown,
  History,
} from 'lucide-react-native';
import { GenerateButton } from '../../components/GenerateButton';
import { InspectionChecklist } from '../../components/InspectionChecklist';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { colors } from '@/constants/theme';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'due' | 'overdue' | 'completed' | 'skipped';

interface MaintenanceTask {
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
  completedAt?: number;
  partsNeeded?: string[];
}

interface BikeDoc {
  _id: Id<'bikes'>;
  make: string;
  model: string;
  year: number;
  mileage: number;
  lastServiceDate?: string;
  lastServiceMileage?: number;
  notes?: string;
  inspectionStatus?: string;
  imageUrl?: string;
}

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

// ─── Compact Task Row ────────────────────────────────────────────────────────

function TaskRow({
  task,
  onPress,
  currency,
}: {
  task: MaintenanceTask;
  onPress: () => void;
  currency: string;
}) {
  const priority = (task.priority as Priority) in PRIORITY_CONFIG ? (task.priority as Priority) : 'low';
  const status = (task.status as TaskStatus) in STATUS_CONFIG ? (task.status as TaskStatus) : 'pending';
  const priorityCfg = PRIORITY_CONFIG[priority];
  const statusCfg = STATUS_CONFIG[status];
  const isCompleted = status === 'completed';

  return (
    <TouchableOpacity
      style={[s.taskRow, isCompleted && { opacity: 0.55 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.taskAccent, { backgroundColor: priorityCfg.text }]} />
      <View style={s.taskContent}>
        <View style={s.taskTop}>
          <Text style={[s.taskName, isCompleted && s.taskNameDone]} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={s.taskTopRight}>
            <View style={[s.taskBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[s.taskBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
        </View>
        <View style={s.taskMeta}>
          {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) && (
            <Text style={s.taskMetaText}>
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          )}
          {task.estimatedCostUsd ? (
            <Text style={[s.taskMetaText, { color: colors.green }]}>{currency}{task.estimatedCostUsd.toFixed(0)}</Text>
          ) : null}
          {task.partsNeeded && task.partsNeeded.length > 0 && (
            <Text style={s.taskMetaText}>{task.partsNeeded.length} parts</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Free User Setup Card ────────────────────────────────────────────────────

function FreeUserPlanCard() {
  return (
    <TouchableOpacity
      style={s.freeCardButton}
      onPress={() => router.push('/add-task' as any)}
      activeOpacity={0.8}
    >
      <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
      <Text style={s.freeCardButtonText}>Input Manually</Text>
    </TouchableOpacity>
  );
}

// ─── Main Plan Screen ─────────────────────────────────────────────────────────

export default function PlanScreen() {
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const currentUser = useQuery(api.users.getCurrent);
  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);
  const isSubscribed = currentUser?.subscriptionStatus === 'active';

  const [selectedBikeIndex, setSelectedBikeIndex] = useState(0);
  const selectedBike = bikes[selectedBikeIndex] ?? null;
  const bikeId = selectedBike?._id;

  const plan = useQuery(api.maintenancePlans.getByBike, bikeId ? { bikeId } : 'skip');
  const rawTasks = useQuery(api.maintenanceTasks.listByBike, bikeId ? { bikeId } : 'skip');
  const tasks = (rawTasks ?? []) as MaintenanceTask[];

  const yearlyStats = useQuery(api.maintenanceTasks.yearlyStats, bikeId ? { bikeId } : 'skip');
  const completionHistory = useQuery(api.maintenanceTasks.listCompletionHistory, bikeId ? { bikeId } : 'skip');
  const generatePlan = useMutation(api.bikes.generatePlan);
  const completeAndAdvance = useMutation(api.maintenanceTasks.completeAndAdvance);
  const removeBike = useMutation(api.bikes.remove);

  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<Id<'maintenanceTasks'> | null>(null);
  const [bikeToDelete, setBikeToDelete] = useState<BikeDoc | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const tasksSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!isGenerating || !rawTasks) return;
    const currentIds = rawTasks.map((t: MaintenanceTask) => t._id).join(',');
    if (rawTasks.length > 0 && currentIds !== tasksSnapshotRef.current) {
      setIsGenerating(false);
    }
  }, [rawTasks, isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => setIsGenerating(false), 60000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  const handleGeneratePlan = async () => {
    if (!bikeId) return;
    if (!isSubscribed) {
      router.push('/membership' as any);
      return;
    }
    tasksSnapshotRef.current = (rawTasks ?? []).map((t: MaintenanceTask) => t._id).join(',');
    setIsGenerating(true);
    try {
      await generatePlan({ bikeId });
    } catch (error) {
      console.error('Failed to generate plan:', error);
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: Id<'maintenanceTasks'>) => {
    setCompletingTaskId(taskId);
    try {
      await completeAndAdvance({ id: taskId });
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleViewParts = (taskId: Id<'maintenanceTasks'>, taskName: string) => {
    router.push(`/parts/${taskId}?taskName=${encodeURIComponent(taskName)}&bikeId=${bikeId}` as any);
  };

  const handleViewAllParts = () => {
    if (bikeId) router.push(`/parts/bike/${bikeId}` as any);
  };

  const confirmDeleteBike = async () => {
    if (!bikeToDelete) return;
    try {
      await removeBike({ id: bikeToDelete._id });
      if (selectedBikeIndex >= bikes.length - 1) {
        setSelectedBikeIndex(Math.max(0, bikes.length - 2));
      }
    } catch (error) {
      console.error('Failed to delete bike:', error);
    }
    setBikeToDelete(null);
  };

  // Sort: active first, then by due date
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const sortedActive = [...activeTasks].sort((a, b) => {
    const aMileage = a.dueMileage ?? Infinity;
    const bMileage = b.dueMileage ?? Infinity;
    if (aMileage !== bMileage) return aMileage - bMileage;
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  });

  // Yearly progress (includes recurring task projections)
  const yearCompletedCount = yearlyStats?.completedThisYear ?? 0;
  const yearTotalCount = yearlyStats?.totalThisYear ?? 0;
  const yearProgress = yearTotalCount > 0 ? yearCompletedCount / yearTotalCount : 0;
  const yearRemaining = yearTotalCount - yearCompletedCount;

  // No bikes
  if (bikes.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={s.emptyScreen}>
          <View style={s.emptyIconCircle}>
            <Wrench size={32} color={colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No Bikes Yet</Text>
          <Text style={s.emptySubtitle}>Add a bike to generate a maintenance plan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={s.screenTitle}>Plan</Text>

        {/* Bike selector */}
        {bikes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            <View style={s.chipRow}>
              {bikes.map((bike, index) => (
                <TouchableOpacity
                  key={bike._id}
                  style={[s.chip, selectedBikeIndex === index && s.chipActive]}
                  onPress={() => setSelectedBikeIndex(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, selectedBikeIndex === index && s.chipTextActive]}>
                    {bike.make} {bike.model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Bike header card */}
        {selectedBike && (
          <View style={s.bikeCardOuter}>
            <BlurView intensity={20} tint="dark" style={s.bikeCard}>
              <View style={s.bikeCardLeft}>
                <View style={s.bikeIconCircle}>
                  <Gauge size={18} color={colors.green} strokeWidth={1.8} />
                </View>
                <View>
                  <Text style={s.bikeName}>{selectedBike.year} {selectedBike.make} {selectedBike.model}</Text>
                  <Text style={s.bikeMileage}>{selectedBike.mileage.toLocaleString()} km</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => setBikeToDelete(selectedBike)}
                activeOpacity={0.7}
              >
                <Trash2 size={15} color={colors.red} />
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        {/* ── Plan Content ── */}

        {/* Needs inspection */}
        {bikeId && !plan && selectedBike && !selectedBike.lastServiceDate && selectedBike.inspectionStatus !== 'complete' ? (
          <>
            <InspectionChecklist
              bikeId={bikeId}
              inspectionStatus={selectedBike.inspectionStatus}
              isSubscribed={isSubscribed}
            />
            {!isSubscribed && <FreeUserPlanCard />}
          </>

        /* Generating after inspection */
        ) : bikeId && !plan && selectedBike?.inspectionStatus === 'complete' ? (
          <View style={s.generatingBox}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={s.generatingTitle}>Building your plan...</Text>
            <Text style={s.generatingSubtitle}>Analyzing inspection results</Text>
          </View>

        /* No plan yet */
        ) : bikeId && !plan ? (
          <>
            <View style={s.noPlanOuter}>
              <BlurView intensity={20} tint="dark" style={s.noPlanCard}>
                <View style={s.noPlanIconCircle}>
                  <Shield size={28} color={colors.textTertiary} strokeWidth={1.5} />
                </View>
                <Text style={s.noPlanTitle}>No Maintenance Plan</Text>
                <Text style={s.noPlanSubtitle}>
                  Generate an AI-powered plan tailored to your bike's needs.
                </Text>
                <GenerateButton
                  label="Generate Plan"
                  loadingLabel="Generating Plan"
                  onPress={handleGeneratePlan}
                  isLoading={isGenerating}
                  variant="primary"
                  style={{ marginTop: 4 }}
                />
              </BlurView>
            </View>
            {!isSubscribed && <FreeUserPlanCard />}
          </>

        /* Tasks loading */
        ) : bikeId && plan && tasks.length === 0 ? (
          <View style={s.generatingBox}>
            <Clock size={28} color={colors.textSecondary} />
            <Text style={s.generatingTitle}>Tasks loading...</Text>
          </View>

        /* Plan with tasks */
        ) : bikeId && plan ? (
          <>
            {/* Progress overview — year-scoped with recurring projections */}
            <View style={s.progressOuter}>
              <BlurView intensity={20} tint="dark" style={s.progressCard}>
                <View style={s.progressHeader}>
                  <Text style={s.progressLabel}>{new Date().getFullYear()} Progress</Text>
                  <Text style={s.progressCount}>
                    <Text style={{ color: colors.green }}>{yearCompletedCount}</Text>
                    <Text style={{ color: colors.textTertiary }}>/{yearTotalCount}</Text>
                  </Text>
                </View>
                <View style={s.progressBarTrack}>
                  <View style={[s.progressBarFill, { width: `${Math.max(yearProgress * 100, 2)}%` as any }]} />
                </View>
                <View style={s.progressStats}>
                  <View style={s.progressStat}>
                    <Clock size={13} color={colors.orange} />
                    <Text style={s.progressStatValue}>{yearRemaining}</Text>
                    <Text style={s.progressStatLabel}>Remaining</Text>
                  </View>
                  {plan.nextServiceDate && (
                    <View style={s.progressStat}>
                      <Calendar size={13} color={colors.blue} />
                      <Text style={s.progressStatValue}>{plan.nextServiceDate}</Text>
                      <Text style={s.progressStatLabel}>Next Service</Text>
                    </View>
                  )}
                  <View style={s.progressStat}>
                    <CheckCircle2 size={13} color={colors.green} />
                    <Text style={s.progressStatValue}>{Math.round(yearProgress * 100)}%</Text>
                    <Text style={s.progressStatLabel}>Complete</Text>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Maintenance Tasks */}
            <Text style={s.sectionLabel}>Maintenance Tasks</Text>
            <View style={s.taskListOuter}>
              <BlurView intensity={15} tint="dark" style={s.taskListCard}>
                {sortedActive.map((task, i) => (
                  <Animated.View key={task._id} layout={Layout.springify()} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    {i > 0 && <View style={s.taskDivider} />}
                    <TaskRow
                      task={task}
                      onPress={() => setSelectedTask(task)}
                      currency={currency}
                    />
                  </Animated.View>
                ))}
              </BlurView>
            </View>

            {/* Completion History (collapsible) */}
            {(completionHistory ?? []).length > 0 && (
              <>
                <TouchableOpacity
                  style={s.historyToggle}
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                  activeOpacity={0.7}
                >
                  <History size={14} color={colors.textTertiary} />
                  <Text style={s.historyToggleText}>
                    Completion History ({(completionHistory ?? []).length})
                  </Text>
                  <Animated.View style={{ transform: [{ rotate: historyExpanded ? '180deg' : '0deg' }] }}>
                    <ChevronDown size={16} color={colors.textTertiary} />
                  </Animated.View>
                </TouchableOpacity>

                {historyExpanded && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <View style={s.taskListOuter}>
                      <BlurView intensity={15} tint="dark" style={s.taskListCard}>
                        {(completionHistory ?? []).map((entry, i) => (
                          <React.Fragment key={entry._id}>
                            {i > 0 && <View style={s.taskDivider} />}
                            <View style={s.historyRow}>
                              <View style={s.historyRowLeft}>
                                <CheckCircle2 size={14} color={colors.green} />
                                <View>
                                  <Text style={s.historyName}>{entry.taskName}</Text>
                                  <Text style={s.historyDate}>
                                    {new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {entry.dueDate ? ` · was due ${new Date(entry.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                                  </Text>
                                </View>
                              </View>
                              {entry.estimatedLaborCostUsd ? (
                                <Text style={s.historySaved}>+{currency}{Math.round(entry.estimatedLaborCostUsd)}</Text>
                              ) : null}
                            </View>
                          </React.Fragment>
                        ))}
                      </BlurView>
                    </View>
                  </Animated.View>
                )}
              </>
            )}

            {/* Bottom actions */}
            <View style={s.bottomActions}>
              <TouchableOpacity style={s.partsButton} onPress={handleViewAllParts} activeOpacity={0.8}>
                <Package size={16} color="#FFFFFF" />
                <Text style={s.partsButtonText}>All Parts</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <GenerateButton
                  label="Regenerate"
                  loadingLabel="Regenerating"
                  onPress={handleGeneratePlan}
                  isLoading={isGenerating}
                  variant="secondary"
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={bikeToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBikeToDelete(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setBikeToDelete(null)}>
          <Pressable style={s.modalBoxOuter} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={s.modalBox}>
              <Text style={s.modalTitle}>Delete Bike</Text>
              <Text style={s.modalMessage}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '700' }}>{bikeToDelete?.make} {bikeToDelete?.model}</Text>?
                This will also remove its maintenance plan and all tasks.
              </Text>
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.modalCancelBtn} onPress={() => setBikeToDelete(null)} activeOpacity={0.7}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalDeleteBtn} onPress={confirmDeleteBike} activeOpacity={0.7}>
                  <Text style={s.modalDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={selectedTask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTask(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setSelectedTask(null)}>
          <Pressable style={s.taskDetailOuter} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={s.taskDetailBox}>
            {selectedTask && (() => {
              const pri = (selectedTask.priority as Priority) in PRIORITY_CONFIG ? (selectedTask.priority as Priority) : 'low';
              const stat = (selectedTask.status as TaskStatus) in STATUS_CONFIG ? (selectedTask.status as TaskStatus) : 'pending';
              const priCfg = PRIORITY_CONFIG[pri];
              const statCfg = STATUS_CONFIG[stat];
              const isDone = stat === 'completed';
              return (
                <>
                  {/* Header */}
                  <View style={s.tdHeader}>
                    <View style={[s.tdAccent, { backgroundColor: priCfg.text }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.tdTitle}>{selectedTask.name}</Text>
                      <View style={s.tdBadges}>
                        <View style={[s.taskBadge, { backgroundColor: priCfg.bg }]}>
                          <Text style={[s.taskBadgeText, { color: priCfg.text }]}>{priCfg.label}</Text>
                        </View>
                        <View style={[s.taskBadge, { backgroundColor: statCfg.bg }]}>
                          <Text style={[s.taskBadgeText, { color: statCfg.text }]}>{statCfg.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  {selectedTask.description && (
                    <Text style={s.tdDescription}>{selectedTask.description}</Text>
                  )}

                  {/* Details grid */}
                  <View style={s.tdGrid}>
                    {selectedTask.dueDate && /^\d{4}-\d{2}-\d{2}/.test(selectedTask.dueDate) && (
                      <View style={s.tdGridItem}>
                        <Calendar size={13} color={colors.textTertiary} />
                        <Text style={s.tdGridLabel}>Due</Text>
                        <Text style={s.tdGridValue}>{new Date(selectedTask.dueDate + 'T00:00:00').toLocaleDateString()}</Text>
                      </View>
                    )}
                    {selectedTask.dueMileage && (
                      <View style={s.tdGridItem}>
                        <Gauge size={13} color={colors.textTertiary} />
                        <Text style={s.tdGridLabel}>Mileage</Text>
                        <Text style={s.tdGridValue}>{selectedTask.dueMileage.toLocaleString()} km</Text>
                      </View>
                    )}
                    {(selectedTask.intervalKm || selectedTask.intervalMonths) && (
                      <View style={s.tdGridItem}>
                        <RefreshCw size={13} color={colors.textTertiary} />
                        <Text style={s.tdGridLabel}>Interval</Text>
                        <Text style={s.tdGridValue}>
                          {[selectedTask.intervalKm ? `${selectedTask.intervalKm.toLocaleString()} km` : null, selectedTask.intervalMonths ? `${selectedTask.intervalMonths} mo` : null].filter(Boolean).join(' / ')}
                        </Text>
                      </View>
                    )}
                    {selectedTask.estimatedCostUsd && (
                      <View style={s.tdGridItem}>
                        <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={13} color={colors.textTertiary} />
                        <Text style={s.tdGridLabel}>Est. Cost</Text>
                        <Text style={[s.tdGridValue, { color: colors.green }]}>{currency}{selectedTask.estimatedCostUsd.toFixed(0)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Parts */}
                  {selectedTask.partsNeeded && selectedTask.partsNeeded.length > 0 && (
                    <View style={s.tdParts}>
                      <Text style={s.tdPartsLabel}>Parts Needed</Text>
                      {selectedTask.partsNeeded.map((part, idx) => (
                        <View key={idx} style={s.tdPartRow}>
                          <CircleDot size={8} color={colors.textTertiary} />
                          <Text style={s.tdPartText}>{part}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.tdActions}>
                    <TouchableOpacity
                      style={s.tdPartsBtn}
                      onPress={() => { setSelectedTask(null); handleViewParts(selectedTask._id, selectedTask.name); }}
                      activeOpacity={0.7}
                    >
                      <Package size={14} color={colors.blue} />
                      <Text style={s.tdPartsBtnText}>View Parts</Text>
                    </TouchableOpacity>
                    {!isDone && (
                      <TouchableOpacity
                        style={[s.tdCompleteBtn, completingTaskId === selectedTask._id && { opacity: 0.5 }]}
                        onPress={() => { handleCompleteTask(selectedTask._id); setSelectedTask(null); }}
                        activeOpacity={0.7}
                        disabled={completingTaskId === selectedTask._id}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" />
                        <Text style={s.tdCompleteBtnText}>Mark Complete</Text>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 120, gap: 12 },

  screenTitle: {
    fontSize: 28, fontWeight: '700', color: colors.textPrimary,
    textAlign: 'center', marginTop: 8, marginBottom: 4,
  },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  chip: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: 'rgba(0,229,153,0.15)', borderColor: colors.green },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.green },

  // Bike header
  bikeCardOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  bikeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  bikeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bikeIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,229,153,0.1)', borderWidth: 1, borderColor: 'rgba(0,229,153,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bikeName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  bikeMileage: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 1 },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,107,107,0.1)', alignItems: 'center', justifyContent: 'center',
  },

  // Empty / generating
  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 120 },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },

  generatingBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  generatingTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  generatingSubtitle: { fontSize: 13, color: colors.textSecondary },

  // No plan card
  noPlanOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  noPlanCard: { alignItems: 'center', padding: 28, gap: 10 },
  noPlanIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  noPlanTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  noPlanSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Progress card
  progressOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  progressCard: { padding: 16, gap: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  progressCount: { fontSize: 18, fontWeight: '800' },
  progressBarTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: colors.green },
  progressStats: { flexDirection: 'row', gap: 8 },
  progressStat: {
    flex: 1, alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingVertical: 10,
  },
  progressStatValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  progressStatLabel: { fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section label
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },

  // Task list card (grouped)
  taskListOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  taskListCard: { padding: 0 },
  taskDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 14 },

  // Task row
  taskRow: { flexDirection: 'row', overflow: 'hidden' },
  taskAccent: { width: 3 },
  taskContent: { flex: 1, padding: 14, gap: 6 },
  taskTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  taskName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  taskNameDone: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  taskBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  taskBadgeText: { fontSize: 10, fontWeight: '700' },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taskMetaText: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },

  // Bottom actions
  bottomActions: { flexDirection: 'row', gap: 10 },
  partsButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.blue, borderRadius: 12, paddingVertical: 14,
  },
  partsButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Free user
  freeCardButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
    paddingVertical: 14,
  },
  freeCardButtonText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalBoxOuter: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    width: '85%', maxWidth: 340, overflow: 'hidden',
    backgroundColor: 'rgba(37,37,64,0.6)',
  },
  modalBox: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalMessage: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(26,26,46,0.6)', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  modalDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.red, alignItems: 'center' },
  modalDeleteText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Task detail modal
  taskDetailOuter: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    width: '90%', maxWidth: 400, overflow: 'hidden',
    backgroundColor: 'rgba(37,37,64,0.6)',
  },
  taskDetailBox: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    gap: 14,
  },
  tdHeader: { flexDirection: 'row', gap: 10 },
  tdAccent: { width: 3, borderRadius: 1.5, alignSelf: 'stretch' },
  tdTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, lineHeight: 22 },
  tdBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tdDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  tdGrid: { gap: 0 },
  tdGridItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tdGridLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 },
  tdGridValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  tdParts: { gap: 6 },
  tdPartsLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tdPartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  tdPartText: { fontSize: 13, color: colors.textSecondary },
  tdActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  tdPartsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(91,141,239,0.2)', borderRadius: 10, paddingVertical: 12,
    backgroundColor: 'rgba(91,141,239,0.1)',
  },
  tdPartsBtnText: { fontSize: 14, fontWeight: '600', color: colors.blue },
  tdCompleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12,
  },
  tdCompleteBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Task row top right
  taskTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // History toggle
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10,
  },
  historyToggleText: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },

  // History rows
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, gap: 10,
  },
  historyRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  historyName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  historyDate: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  historySaved: { fontSize: 13, fontWeight: '700', color: colors.green },
});
