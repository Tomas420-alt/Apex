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
import { InspectionChecklist } from '../../components/InspectionChecklist';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { colors } from '@/constants/theme';

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
  inspectionStatus?: string;
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { bg: string; text: string; label: string }
> = {
  critical: { bg: colors.priority.critical.bg, text: colors.priority.critical.text, label: 'Critical' },
  high: { bg: colors.priority.high.bg, text: colors.priority.high.text, label: 'High' },
  medium: { bg: colors.priority.medium.bg, text: colors.priority.medium.text, label: 'Medium' },
  low: { bg: colors.priority.low.bg, text: colors.priority.low.text, label: 'Low' },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: colors.status.pending.bg, text: colors.status.pending.text, label: 'Pending' },
  due: { bg: colors.status.due.bg, text: colors.status.due.text, label: 'Due' },
  overdue: { bg: colors.status.overdue.bg, text: colors.status.overdue.text, label: 'Overdue' },
  completed: { bg: colors.status.completed.bg, text: colors.status.completed.text, label: 'Completed' },
  skipped: { bg: colors.status.skipped.bg, text: colors.status.skipped.text, label: 'Skipped' },
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
            <RefreshCw size={12} color={colors.textSecondary} />
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
            <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              ~{task.estimatedCostUsd.toFixed(0)}
            </Text>
          </View>
        ) : null}

        {task.dueMileage ? (
          <View style={styles.metaItem}>
            <Gauge size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              Due at {task.dueMileage.toLocaleString()} km
            </Text>
          </View>
        ) : null}

        {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) ? (
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Parts needed chips */}
      {task.partsNeeded && task.partsNeeded.length > 0 ? (
        <View style={styles.partsChipRow}>
          {task.partsNeeded.slice(0, 3).map((part, idx) => (
            <View key={idx} style={styles.partChip}>
              <CircleDot size={10} color={colors.textSecondary} />
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
          <Package size={14} color={colors.blue} />
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
            <CheckCircle2 size={14} color={colors.green} />
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
            placeholderTextColor={colors.textTertiary}
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
        <Wrench size={40} color={colors.textSecondary} />
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
  const { id, taskId: rawTaskId } = useLocalSearchParams<{ id: string; taskId?: string }>();
  // Expo Router may append suffixes like _r2 for repeated navigations — strip them
  const scrollToTaskId = rawTaskId?.replace(/_r\d+$/, '');
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
  const resetForInspection = useMutation(api.inspectionMutations.resetForInspection);

  const [mileageModalVisible, setMileageModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<Id<'maintenanceTasks'> | null>(null);
  const tasksSnapshotRef = useRef<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const taskLayoutsRef = useRef<Record<string, number>>({});
  const [layoutsReady, setLayoutsReady] = useState(false);

  const isLoading = bike === undefined || plan === undefined;

  // Stop generating when tasks data actually changes from the snapshot
  useEffect(() => {
    if (!isGenerating || !rawTasks) return;
    const currentIds = rawTasks.map((t: MaintenanceTask) => t._id).join(',');
    if (rawTasks.length > 0 && currentIds !== tasksSnapshotRef.current) {
      setIsGenerating(false);
    }
  }, [rawTasks, isGenerating]);

  // Scroll to the target task once all task layouts have been captured
  useEffect(() => {
    if (!scrollToTaskId || hasScrolledRef.current || !layoutsReady) return;
    const y = taskLayoutsRef.current[scrollToTaskId];
    if (y !== undefined) {
      hasScrolledRef.current = true;
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
      });
    }
  }, [scrollToTaskId, layoutsReady]);

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
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading bike details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found state ──────────────────────────────────────────────────────────
  if (!bike) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
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
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bike Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.notFoundContainer}>
          <AlertTriangle size={48} color={colors.red} />
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

  // ── Sort tasks: completed/skipped at bottom, everything else by mileage then date
  const sortedTasks = [...tasks].sort((a, b) => {
    const aDone = a.status === 'completed' || a.status === 'skipped' ? 1 : 0;
    const bDone = b.status === 'completed' || b.status === 'skipped' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    // Sort by due mileage ascending
    const aMileage = a.dueMileage ?? Infinity;
    const bMileage = b.dueMileage ?? Infinity;
    if (aMileage !== bMileage) return aMileage - bMileage;

    // Then by due date
    const aDate = a.dueDate ?? '';
    const bDate = b.dueDate ?? '';
    return aDate.localeCompare(bDate);
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

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
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bike.make} {bike.model}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
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
                <AlertTriangle size={12} color={colors.red} />
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
              <Gauge size={16} color={colors.green} />
              <View style={styles.statTextBlock}>
                <Text style={styles.statValue}>
                  {bike.mileage.toLocaleString()} km
                </Text>
                <Text style={styles.statLabel}>Current Mileage</Text>
              </View>
            </View>

            {bike.lastServiceDate ? (
              <View style={[styles.statItem, styles.statItemBordered]}>
                <Calendar size={16} color={colors.blue} />
                <View style={styles.statTextBlock}>
                  <Text style={styles.statValue}>{bike.lastServiceDate}</Text>
                  <Text style={styles.statLabel}>Last Service</Text>
                </View>
              </View>
            ) : null}

            {bike.lastServiceMileage ? (
              <View style={[styles.statItem, styles.statItemBordered]}>
                <Wrench size={16} color={colors.orange} />
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
            <Gauge size={15} color={colors.textPrimary} />
            <Text style={styles.updateMileageText}>Update Mileage</Text>
          </TouchableOpacity>
        </View>

        {/* ── Maintenance Plan Section ── */}
        <View style={styles.sectionHeader}>
          <Wrench size={18} color={colors.textPrimary} />
          <Text style={styles.sectionTitle}>Maintenance Plan</Text>
          {plan && tasks.length > 0 ? (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {completedCount}/{tasks.length}
              </Text>
            </View>
          ) : null}
        </View>

        {!plan && bike && !bike.lastServiceDate && bike.inspectionStatus !== 'complete' ? (
          <InspectionChecklist
            bikeId={bikeId}
            inspectionStatus={bike.inspectionStatus}
          />
        ) : !plan && bike.inspectionStatus === 'complete' ? (
          /* Inspection done, plan is being generated — show loading, not the generate button */
          <View style={styles.emptyPlanContainer}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.emptyPlanTitle}>Generating Maintenance Plan</Text>
            <Text style={styles.emptyPlanSubtitle}>
              Using your inspection results to create a tailored plan...
            </Text>
          </View>
        ) : !plan ? (
          <EmptyPlan
            isGenerating={isGenerating}
            onGenerate={handleGeneratePlan}
          />
        ) : tasks.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Clock size={32} color={colors.textSecondary} />
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
                  <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={15} color={colors.green} />
                  <Text style={styles.planSummaryLabel}>
                    Total Estimated Cost
                  </Text>
                  <Text style={styles.planSummaryValue}>
                    {currency}{plan.totalEstimatedCost.toFixed(0)}
                  </Text>
                </View>
                {plan.nextServiceDate ? (
                  <View style={[styles.planSummaryItem, styles.planSummaryItemBordered]}>
                    <Calendar size={15} color={colors.blue} />
                    <Text style={styles.planSummaryLabel}>Next Service</Text>
                    <Text style={styles.planSummaryValue}>
                      {plan.nextServiceDate}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Task cards */}
            {sortedTasks.map((task, index) => (
              <View
                key={task._id}
                onLayout={(e) => {
                  taskLayoutsRef.current[task._id] = e.nativeEvent.layout.y;
                  // Signal ready after the last task lays out
                  if (index === sortedTasks.length - 1 && scrollToTaskId) {
                    setLayoutsReady(true);
                  }
                }}
              >
                <TaskCard
                  task={task}
                  bikeId={bikeId}
                  onComplete={handleCompleteTask}
                  onViewParts={handleViewParts}
                  isCompleting={completingTaskId === task._id}
                  currency={currency}
                  currencyIconName={currencyIconName}
                />
              </View>
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

        {/* TEMP: Reset for inspection testing */}
        <TouchableOpacity
          style={{ backgroundColor: colors.red, borderRadius: 12, padding: 14, marginTop: 16, alignItems: 'center' }}
          onPress={async () => {
            await resetForInspection({ bikeId });
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>TEMP: Reset for Inspection</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.bg,
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
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginTop: 8,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  goBackButton: {
    marginTop: 12,
    backgroundColor: colors.surface2,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
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
    paddingBottom: 120,
    gap: 16,
  },

  // Bike info card
  bikeInfoCard: {
    backgroundColor: colors.surface1,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bikeInfoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  yearBadge: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  yearBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overduePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.red,
  },
  bikeFullName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
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
    borderLeftColor: colors.border,
    paddingLeft: 16,
    marginLeft: 8,
  },
  statTextBlock: {
    gap: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  updateMileageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateMileageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Empty plan
  emptyPlanContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyPlanIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyPlanSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Plan summary
  planSummaryCard: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  planSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  planSummaryItemBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    marginLeft: 12,
    paddingLeft: 12,
  },
  planSummaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  planSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Task card
  taskCard: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  taskCardCompleted: {
    opacity: 0.7,
    borderColor: 'rgba(0,229,153,0.15)',
    backgroundColor: colors.surface1,
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
    color: colors.textPrimary,
    lineHeight: 20,
  },
  taskNameCompleted: {
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 160,
  },
  partChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  taskActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  viewPartsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(91,141,239,0.2)',
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: 'rgba(91,141,239,0.12)',
  },
  viewPartsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: 9,
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
    backgroundColor: 'rgba(0,229,153,0.15)',
    borderRadius: 8,
    paddingVertical: 9,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },


  // All parts button
  allPartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    marginHorizontal: 4,
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
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -4,
  },
  modalInput: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 17,
    color: colors.textPrimary,
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
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.surface1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
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
