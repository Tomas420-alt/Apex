import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { router } from 'expo-router';
import { Id } from '../../convex/_generated/dataModel';

import { SummaryCards } from '../../components/maintenance/SummaryCards';
import { BikeFilterChips } from '../../components/maintenance/BikeFilterChips';
import { TaskCard } from '../../components/maintenance/TaskCard';
import { CompletedSection } from '../../components/maintenance/CompletedSection';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';

export default function MaintenanceScreen() {
  // Queries
  const tasks = useQuery(api.maintenanceTasks.listDue);
  const recentlyCompleted = useQuery(api.maintenanceTasks.listRecentlyCompleted);
  const completedCount = useQuery(api.maintenanceTasks.countCompleted);
  const savings = useQuery(api.maintenanceTasks.totalSavings);
  const user = useQuery(api.users.getCurrent);
  const bikes = useQuery(api.bikes.list) as {
    _id: Id<'bikes'>;
    make: string;
    model: string;
  }[] | undefined;

  const currency = getCurrencySymbol(user?.country);
  const currencyIconName = getCurrencyIconName(user?.country);

  // Mutations
  const completeMutation = useMutation(api.maintenanceTasks.complete);
  const cleanupOrphaned = useMutation(api.maintenanceTasks.cleanupOrphaned);

  // Run cleanup once on mount to purge any orphaned tasks from deleted bikes
  const hasCleanedUp = useRef(false);
  useEffect(() => {
    if (!hasCleanedUp.current && user) {
      hasCleanedUp.current = true;
      cleanupOrphaned().catch(console.error);
    }
  }, [user, cleanupOrphaned]);

  // State
  const [selectedBikeId, setSelectedBikeId] = useState<Id<'bikes'> | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [taskToComplete, setTaskToComplete] = useState<{
    id: Id<'maintenanceTasks'>;
    name: string;
  } | null>(null);

  const isLoading = tasks === undefined || bikes === undefined;

  // Build bikeId → "Make Model" lookup
  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    ((bikes as any) ?? []).forEach((b: any) =>
      map.set(b._id, `${b.make} ${b.model}`)
    );
    return map;
  }, [bikes]);

  const bikeList = ((bikes as any) ?? []) as {
    _id: Id<'bikes'>;
    make: string;
    model: string;
  }[];

  const overdueTasks = tasks?.filter((t) => t.status === 'overdue') ?? [];
  const dueTasks = tasks?.filter((t) => t.status === 'due' || t.status === 'pending') ?? [];
  const allTasks = [...overdueTasks, ...dueTasks];

  // Apply bike filter
  const filteredTasks = selectedBikeId
    ? allTasks.filter((t) => t.bikeId === selectedBikeId)
    : allTasks;

  const filteredCompleted = selectedBikeId
    ? (recentlyCompleted ?? []).filter((t) => t.bikeId === selectedBikeId)
    : (recentlyCompleted ?? []);

  // Handlers
  const handleConfirmComplete = async () => {
    if (!taskToComplete) return;
    const { id } = taskToComplete;
    setTaskToComplete(null);
    setCompletingIds((prev) => new Set(prev).add(id));
    try {
      await completeMutation({ id });
    } catch (e) {
      console.error('Failed to complete task:', e);
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.title}>Maintenance</Text>
        <Text style={styles.subtitle}>
          {isLoading
            ? 'Loading...'
            : allTasks.length > 0
              ? `${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} need attention`
              : 'All tasks up to date'}
        </Text>
      </View>

      {/* Summary Cards */}
      {!isLoading && (
        <SummaryCards
          overdueCount={overdueTasks.length}
          dueCount={dueTasks.length}
          completedCount={completedCount ?? 0}
          totalSavings={savings ?? 0}
          currency={currency}
          currencyIconName={currencyIconName}
        />
      )}

      {/* Bike Filter Chips */}
      <BikeFilterChips
        bikes={bikeList}
        selectedBikeId={selectedBikeId}
        onSelect={setSelectedBikeId}
      />

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
      </View>

      {/* Task List + Completed Section */}
      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : filteredTasks.length === 0 && filteredCompleted.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Wrench size={48} color="#D1D5DB" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No maintenance tasks yet</Text>
            <Text style={styles.emptyDescription}>
              Add a bike and generate a maintenance plan to get started.
            </Text>
          </View>
        ) : (
          <>
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                bikeName={bikeNameMap.get(task.bikeId) ?? 'Unknown Bike'}
                onPress={() => router.push(`/bike/${task.bikeId}` as any)}
                onComplete={(id) =>
                  setTaskToComplete({ id, name: task.name })
                }
                isCompleting={completingIds.has(task._id)}
                currency={currency}
              />
            ))}

            {filteredTasks.length > 0 && filteredCompleted.length > 0 && (
              <View style={styles.divider} />
            )}

            <CompletedSection
              tasks={filteredCompleted.map((t) => ({
                _id: t._id,
                name: t.name,
                completedAt: t.completedAt,
                estimatedLaborCostUsd: t.estimatedLaborCostUsd,
                bikeName: bikeNameMap.get(t.bikeId) ?? 'Unknown Bike',
              }))}
              currency={currency}
            />
          </>
        )}
      </ScrollView>

      {/* Complete Confirmation Modal */}
      <Modal
        visible={taskToComplete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskToComplete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTaskToComplete(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Mark Complete</Text>
            <Text style={styles.modalMessage}>
              Mark{' '}
              <Text style={{ fontWeight: '700' }}>{taskToComplete?.name}</Text>
              {' '}as completed?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTaskToComplete(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmComplete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  taskListContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
