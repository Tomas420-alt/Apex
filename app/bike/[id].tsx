import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  ArrowLeft,
  Gauge,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  CircleDot,
  RefreshCw,
} from 'lucide-react-native';
import { GenerateButton } from '../../components/GenerateButton';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';
import { CurrencyIcon } from '../../components/CurrencyIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { bg: string; text: string; label: string }
> = {
  critical: { bg: '#FEE2E2', text: '#991B1B', label: 'Critical' },
  high: { bg: '#FED7AA', text: '#9A3412', label: 'High' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'Medium' },
  low: { bg: '#E5E7EB', text: '#4B5563', label: 'Low' },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: '#F3F4F6', text: '#6B7280', label: 'Pending' },
  due: { bg: '#DBEAFE', text: '#1E40AF', label: 'Due' },
  overdue: { bg: '#FEE2E2', text: '#991B1B', label: 'Overdue' },
  completed: { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
  skipped: { bg: '#F3F4F6', text: '#9CA3AF', label: 'Skipped' },
};

// ─── TaskCard component ───────────────────────────────────────────────────────

interface TaskCardProps {
  task: MaintenanceTask;
  bikeId: Id<'bikes'>;
  onComplete: (taskId: Id<'maintenanceTasks'>) => void;
  onViewParts: (taskId: Id<'maintenanceTasks'>, taskName: string) => void;
  isCompleting: boolean;
  currency: string;
  currencyIconName: string | null;
}

function TaskCard({
  task,
  bikeId,
  onComplete,
  onViewParts,
  isCompleting,
  currency,
  currencyIconName,
}: TaskCardProps) {
  const priority = (task.priority as Priority) in PRIORITY_CONFIG
    ? (task.priority as Priority)
    : 'low';
  const status = (task.status as TaskStatus) in STATUS_CONFIG
    ? (task.status as TaskStatus)
    : 'pending';

  const priorityCfg = PRIORITY_CONFIG[priority];
  const statusCfg = STATUS_CONFIG[status];
  const isCompleted = status === 'completed';

  return (
    <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
      {/* Task header row */}
      <View style={styles.taskHeaderRow}>
        <View style={styles.taskTitleBlock}>
          <Text
            style={[styles.taskName, isCompleted && styles.taskNameCompleted]}
            numberOfLines={2}
          >
            {task.name}
          </Text>
        </View>
        <View style={styles.taskBadgeColumn}>
          {/* Priority badge */}
          <View style={[styles.badge, { backgroundColor: priorityCfg.bg }]}>
            <Text style={[styles.badgeText, { color: priorityCfg.text }]}>
              {priorityCfg.label}
            </Text>
          </View>
          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: statusCfg.bg, marginTop: 4 }]}>
            <Text style={[styles.badgeText, { color: statusCfg.text }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {task.description ? (
        <Text style={styles.taskDescription} numberOfLines={3}>
          {task.description}
        </Text>
      ) : null}

      {/* Interval & cost row */}
      <View style={styles.taskMetaRow}>
        {(task.intervalKm || task.intervalMonths) ? (
          <View style={styles.metaItem}>
            <RefreshCw size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              {[
                task.intervalKm ? `${task.intervalKm.toLocaleString()} km` : null,
                task.intervalMonths ? `${task.intervalMonths} mo` : null,
              ]
                .filter(Boolean)
                .join(' / ')}
            </Text>
          </View>
        ) : null}

        {task.estimatedCostUsd ? (
          <View style={styles.metaItem}>
            <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              ~{task.estimatedCostUsd.toFixed(0)}
            </Text>
          </View>
        ) : null}

        {task.dueMileage ? (
          <View style={styles.metaItem}>
            <Gauge size={12} color="#6B7280" />
            <Text style={styles.metaText}>
              Due at {task.dueMileage.toLocaleString()} km
            </Text>
          </View>
        ) : null}

        {task.dueDate ? (
          <View style={styles.metaItem}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.metaText}>{task.dueDate}</Text>
          </View>
        ) : null}
      </View>

      {/* Parts needed chips */}
      {task.partsNeeded && task.partsNeeded.length > 0 ? (
        <View style={styles.partsChipRow}>
          {task.partsNeeded.slice(0, 3).map((part, idx) => (
            <View key={idx} style={styles.partChip}>
              <CircleDot size={10} color="#6B7280" />
              <Text style={styles.partChipText} numberOfLines={1}>
                {part}
              </Text>
            </View>
          ))}
          {task.partsNeeded.length > 3 ? (
            <View style={styles.partChip}>
              <Text style={styles.partChipText}>
                +{task.partsNeeded.length - 3} more
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Action row */}
      <View style={styles.taskActionRow}>
        <TouchableOpacity
          style={styles.viewPartsButton}
          onPress={() => onViewParts(task._id, task.name)}
          activeOpacity={0.7}
        >
          <Package size={14} color="#3B82F6" />
          <Text style={styles.viewPartsButtonText}>View Parts</Text>
        </TouchableOpacity>

        {!isCompleted ? (
          <TouchableOpacity
            style={[
              styles.completeButton,
              isCompleting && styles.completeButtonDisabled,
            ]}
            onPress={() => onComplete(task._id)}
            activeOpacity={0.75}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle2 size={14} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBadge}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── UpdateMileageModal ────────────────────────────────────────────────────────

interface UpdateMileageModalProps {
  visible: boolean;
  currentMileage: number;
  onClose: () => void;
  onSave: (mileage: number) => Promise<void>;
}

function UpdateMileageModal({
  visible,
  currentMileage,
  onClose,
  onSave,
}: UpdateMileageModalProps) {
  const [value, setValue] = useState(String(currentMileage));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = Number(value);
    if (!value.trim() || isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid mileage', 'Please enter a valid mileage value.');
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update mileage. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Update Mileage</Text>
          <Text style={styles.modalSubtitle}>
            Current: {currentMileage.toLocaleString()} km
          </Text>

          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="Enter new mileage"
            placeholderTextColor="#9CA3AF"
            autoFocus
            selectTextOnFocus
          />

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Empty plan state ─────────────────────────────────────────────────────────

interface EmptyPlanProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

function EmptyPlan({ isGenerating, onGenerate }: EmptyPlanProps) {
  return (
    <View style={styles.emptyPlanContainer}>
      <View style={styles.emptyPlanIconWrapper}>
        <Wrench size={40} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyPlanTitle}>No Maintenance Plan</Text>
      <Text style={styles.emptyPlanSubtitle}>
        Generate an AI-powered maintenance plan tailored to your bike&apos;s make,
        model, and current mileage.
      </Text>
      <GenerateButton
        label="Generate Plan"
        loadingLabel="Generating Plan"
        onPress={onGenerate}
        isLoading={isGenerating}
        variant="primary"
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bikeId = id as Id<'bikes'>;

  const bike = useQuery(api.bikes.get, { id: bikeId }) as BikeDoc | null | undefined;
  const plan = useQuery(api.maintenancePlans.getByBike, { bikeId });
  const rawTasks = useQuery(api.maintenanceTasks.listByBike, { bikeId });
  const tasks = (rawTasks ?? []) as MaintenanceTask[];
  const currentUser = useQuery(api.users.getCurrent);
  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);

  const updateMileage = useMutation(api.bikes.updateMileage);
  const completeTask = useMutation(api.maintenanceTasks.complete);
  const generatePlan = useMutation(api.bikes.generatePlan);

  const [mileageModalVisible, setMileageModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<Id<'maintenanceTasks'> | null>(null);
  const tasksSnapshotRef = useRef<string>('');

  const isLoading = bike === undefined || plan === undefined;

  // Stop generating when tasks data actually changes from the snapshot
  useEffect(() => {
    if (!isGenerating || !rawTasks) return;
    const currentIds = rawTasks.map((t: MaintenanceTask) => t._id).join(',');
    if (rawTasks.length > 0 && currentIds !== tasksSnapshotRef.current) {
      setIsGenerating(false);
    }
  }, [rawTasks, isGenerating]);

  // Safety timeout
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => setIsGenerating(false), 60000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  const handleUpdateMileage = async (mileage: number) => {
    await updateMileage({ id: bikeId, mileage });
  };

  const handleGeneratePlan = async () => {
    tasksSnapshotRef.current = (rawTasks ?? []).map((t: MaintenanceTask) => t._id).join(',');
    setIsGenerating(true);
    try {
      await generatePlan({ bikeId });
    } catch (error) {
      console.error('Failed to generate plan:', error);
      Alert.alert('Error', 'Failed to generate maintenance plan. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: Id<'maintenanceTasks'>) => {
    setCompletingTaskId(taskId);
    try {
      await completeTask({ id: taskId });
    } catch (error) {
      console.error('Failed to complete task:', error);
      Alert.alert('Error', 'Failed to mark task as complete. Please try again.');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleViewParts = (taskId: Id<'maintenanceTasks'>, taskName: string) => {
    router.push(`/parts/${taskId}?taskName=${encodeURIComponent(taskName)}&bikeId=${bikeId}` as any);
  };

  const handleViewAllParts = () => {
    router.push(`/parts/bike/${bikeId}` as any);
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading bike details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found state ──────────────────────────────────────────────────────────
  if (!bike) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bike Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.notFoundContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.notFoundTitle}>Bike Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This bike could not be found or you do not have access to it.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sort tasks: overdue first, then due, then pending, then completed ─────────
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<string, number> = {
      overdue: 0,
      due: 1,
      pending: 2,
      completed: 3,
      skipped: 4,
    };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bike.make} {bike.model}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bike Info Card ── */}
        <View style={styles.bikeInfoCard}>
          {/* Year badge */}
          <View style={styles.bikeInfoTopRow}>
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>{bike.year}</Text>
            </View>
            {overdueCount > 0 ? (
              <View style={styles.overduePill}>
                <AlertTriangle size={12} color="#991B1B" />
                <Text style={styles.overduePillText}>
                  {overdueCount} overdue
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.bikeFullName}>
            {bike.year} {bike.make} {bike.model}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Gauge size={16} color="#10B981" />
              <View style={styles.statTextBlock}>
                <Text style={styles.statValue}>
                  {bike.mileage.toLocaleString()} km
                </Text>
                <Text style={styles.statLabel}>Current Mileage</Text>
              </View>
            </View>

            {bike.lastServiceDate ? (
              <View style={[styles.statItem, styles.statItemBordered]}>
                <Calendar size={16} color="#3B82F6" />
                <View style={styles.statTextBlock}>
                  <Text style={styles.statValue}>{bike.lastServiceDate}</Text>
                  <Text style={styles.statLabel}>Last Service</Text>
                </View>
              </View>
            ) : null}

            {bike.lastServiceMileage ? (
              <View style={[styles.statItem, styles.statItemBordered]}>
                <Wrench size={16} color="#F59E0B" />
                <View style={styles.statTextBlock}>
                  <Text style={styles.statValue}>
                    {bike.lastServiceMileage.toLocaleString()} km
                  </Text>
                  <Text style={styles.statLabel}>Service at</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Update mileage button */}
          <TouchableOpacity
            style={styles.updateMileageButton}
            onPress={() => setMileageModalVisible(true)}
            activeOpacity={0.8}
          >
            <Gauge size={15} color="#1F2937" />
            <Text style={styles.updateMileageText}>Update Mileage</Text>
          </TouchableOpacity>
        </View>

        {/* ── Maintenance Plan Section ── */}
        <View style={styles.sectionHeader}>
          <Wrench size={18} color="#1F2937" />
          <Text style={styles.sectionTitle}>Maintenance Plan</Text>
          {plan && tasks.length > 0 ? (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {completedCount}/{tasks.length}
              </Text>
            </View>
          ) : null}
        </View>

        {!plan ? (
          <EmptyPlan
            isGenerating={isGenerating}
            onGenerate={handleGeneratePlan}
          />
        ) : tasks.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Clock size={32} color="#9CA3AF" />
            <Text style={styles.noTasksText}>
              Plan generated — tasks loading...
            </Text>
          </View>
        ) : (
          <>
            {/* Plan summary row */}
            {plan.totalEstimatedCost > 0 ? (
              <View style={styles.planSummaryCard}>
                <View style={styles.planSummaryItem}>
                  <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={15} color="#10B981" />
                  <Text style={styles.planSummaryLabel}>
                    Total Estimated Cost
                  </Text>
                  <Text style={styles.planSummaryValue}>
                    {currency}{plan.totalEstimatedCost.toFixed(0)}
                  </Text>
                </View>
                {plan.nextServiceDate ? (
                  <View style={[styles.planSummaryItem, styles.planSummaryItemBordered]}>
                    <Calendar size={15} color="#3B82F6" />
                    <Text style={styles.planSummaryLabel}>Next Service</Text>
                    <Text style={styles.planSummaryValue}>
                      {plan.nextServiceDate}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Task cards */}
            {sortedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                bikeId={bikeId}
                onComplete={handleCompleteTask}
                onViewParts={handleViewParts}
                isCompleting={completingTaskId === task._id}
                currency={currency}
                currencyIconName={currencyIconName}
              />
            ))}

            {/* Regenerate plan button */}
            <GenerateButton
              label="Regenerate Plan"
              loadingLabel="Regenerating"
              onPress={handleGeneratePlan}
              isLoading={isGenerating}
              variant="secondary"
              style={{ marginTop: 4 }}
            />
          </>
        )}

        {/* ── View All Parts button ── */}
        {plan ? (
          <TouchableOpacity
            style={styles.allPartsButton}
            onPress={handleViewAllParts}
            activeOpacity={0.85}
          >
            <Package size={18} color="#FFFFFF" />
            <Text style={styles.allPartsButtonText}>View All Parts</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* ── Update Mileage Modal ── */}
      <UpdateMileageModal
        visible={mileageModalVisible}
        currentMileage={bike.mileage}
        onClose={() => setMileageModalVisible(false)}
        onSave={handleUpdateMileage}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Loading / not found
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  goBackButton: {
    marginTop: 12,
    backgroundColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
  },

  // Bike info card
  bikeInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  bikeInfoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  yearBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  yearBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overduePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  bikeFullName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 120,
    paddingVertical: 8,
  },
  statItemBordered: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 16,
    marginLeft: 8,
  },
  statTextBlock: {
    gap: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  updateMileageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  updateMileageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Empty plan
  emptyPlanContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyPlanIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyPlanSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // No tasks
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  noTasksText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Plan summary
  planSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  planSummaryItemBordered: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    marginLeft: 12,
    paddingLeft: 12,
  },
  planSummaryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  planSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },

  // Task card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  taskCardCompleted: {
    opacity: 0.7,
    borderColor: '#D1FAE5',
    backgroundColor: '#F9FFFE',
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitleBlock: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 20,
  },
  taskNameCompleted: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  taskBadgeColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  taskDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  partsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  partChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 160,
  },
  partChipText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 1,
  },
  taskActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  viewPartsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: '#EFF6FF',
  },
  viewPartsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 9,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButtonDisabled: {
    opacity: 0.65,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingVertical: 9,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },


  // All parts button
  allPartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  allPartsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginLeft: -26,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: -4,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 17,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '600',
    marginVertical: 4,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  modalSaveButtonDisabled: {
    opacity: 0.65,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
