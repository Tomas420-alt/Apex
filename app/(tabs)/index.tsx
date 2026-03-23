import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Bike, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/constants/theme';
import { MotorcycleHero } from '../../components/home/MotorcycleHero';
import { SummaryCards, MetricTab } from '../../components/maintenance/SummaryCards';
import { TaskCard } from '../../components/maintenance/TaskCard';
import { CompletedSection } from '../../components/maintenance/CompletedSection';
import { SavingsBreakdown } from '../../components/home/SavingsBreakdown';
import { EmptyUpcoming, EmptyOverdue, EmptyCompleted, EmptyGeneral } from '../../components/home/EmptyStates';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';

interface BikeDoc {
  _id: Id<'bikes'>;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  imageUrl?: string;
  heroImageUrl?: string;
}

function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Bike size={48} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No bikes yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first bike to start tracking maintenance and keeping your ride in top shape.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd} activeOpacity={0.8}>
        <Plus size={16} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Your First Bike</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bike data
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const currentUser = useQuery(api.users.getCurrent);
  const updateSubscription = useMutation(api.users.updateSubscription);
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);
  const updateBikeImageFromStorage = useMutation(api.bikes.updateBikeImageFromStorage);

  // Maintenance data (from old maintenance.tsx)
  const tasks = useQuery(api.maintenanceTasks.listDue);
  const recentlyCompleted = useQuery(api.maintenanceTasks.listRecentlyCompleted);
  const completedCount = useQuery(api.maintenanceTasks.countCompleted);
  const savings = useQuery(api.maintenanceTasks.totalSavings);
  const completeMutation = useMutation(api.maintenanceTasks.completeAndAdvance);
  const cleanupOrphaned = useMutation(api.maintenanceTasks.cleanupOrphaned);
  const yearlyStatsAll = useQuery(api.maintenanceTasks.yearlyStats, {});

  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);

  // Cleanup orphaned tasks once on mount
  const hasCleanedUp = useRef(false);
  useEffect(() => {
    if (!hasCleanedUp.current && currentUser) {
      hasCleanedUp.current = true;
      cleanupOrphaned().catch(console.error);
    }
  }, [currentUser, cleanupOrphaned]);

  // Handle adding a photo to a bike from the hero placeholder
  const handleAddBikePhoto = async (bikeId: Id<'bikes'>) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResult.json();
      await updateBikeImageFromStorage({ bikeId, storageId });
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  // Reverse bikes so first added = first in list (API returns desc)
  const bikesOrdered = useMemo(() => [...bikes].reverse(), [bikes]);

  // State
  const [activeBikeIndex, setActiveBikeIndex] = useState(0);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [taskToComplete, setTaskToComplete] = useState<{ id: Id<'maintenanceTasks'>; name: string } | null>(null);
  const [activeMetricTab, setActiveMetricTab] = useState<MetricTab>('upcoming');

  const activeBike = bikesOrdered[activeBikeIndex] ?? bikesOrdered[0] ?? null;
  const selectedBikeId = activeBike?._id ?? null;

  const yearlyStatsBike = useQuery(
    api.maintenanceTasks.yearlyStats,
    selectedBikeId ? { bikeId: selectedBikeId } : 'skip'
  );
  const yearlyStats = bikes.length > 1 ? yearlyStatsBike : yearlyStatsAll;

  const heroFlatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index >= 0 && index < bikesOrdered.length) {
      setActiveBikeIndex(index);
    }
  }, [screenWidth, bikesOrdered.length]);

  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.make} ${bike.model}`);
    }
    return map;
  }, [bikes]);

  const isLoading = tasks === undefined || bikes.length === undefined;
  const overdueTasks = tasks?.filter((t) => t.status === 'overdue') ?? [];
  const dueTasks = tasks?.filter((t) => t.status === 'due') ?? [];
  const allTasks = [...overdueTasks, ...dueTasks].sort((a, b) => {
    const aMileage = a.dueMileage ?? Infinity;
    const bMileage = b.dueMileage ?? Infinity;
    if (aMileage !== bMileage) return aMileage - bMileage;
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  });

  const filteredOverdue = selectedBikeId ? overdueTasks.filter((t) => t.bikeId === selectedBikeId) : overdueTasks;
  const filteredAllTasks = selectedBikeId ? allTasks.filter((t) => t.bikeId === selectedBikeId) : allTasks;
  const filteredTasks = selectedBikeId ? allTasks.filter((t) => t.bikeId === selectedBikeId) : allTasks;
  const filteredCompleted = selectedBikeId
    ? (recentlyCompleted ?? []).filter((t) => t.bikeId === selectedBikeId)
    : (recentlyCompleted ?? []);
  const filteredCompletedCount = yearlyStats?.completedThisYear ?? 0;
  const filteredSavings = yearlyStats?.savedThisYear ?? 0;

  const heroHeight = screenWidth * 1.15;

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {bikes.length === 0 ? (
        <SafeAreaView style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Garage</Text>
          <EmptyGarage onAdd={() => router.push('/add-bike' as any)} />
        </SafeAreaView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Swipeable Hero — swipe left/right to switch bikes */}
          <View style={styles.heroWrapper}>
            <FlatList
              ref={heroFlatListRef}
              data={bikesOrdered}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onHeroScroll}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={{ width: screenWidth }}>
                  <MotorcycleHero
                    imageUrl={item.imageUrl}
                    heroImageUrl={item.heroImageUrl}
                    bikeName={`${item.year} ${item.make} ${item.model}`}
                    mileage={item.mileage ?? 0}
                    onAddPhoto={() => handleAddBikePhoto(item._id)}
                  />
                </View>
              )}
            />
            {/* Garage title + page dots overlaying the hero */}
            <Text style={[styles.heroTitle, { top: insets.top + 8 }]}>Garage</Text>
            {bikesOrdered.length > 1 && (
              <View style={[styles.pageDots, { top: insets.top + 30 }]}>
                {bikesOrdered.map((_, i) => (
                  <View key={i} style={[styles.pageDot, i === activeBikeIndex && styles.pageDotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* ── Maintenance Dashboard ── */}
          <View style={styles.dashboardContent}>
            {/* Summary Cards — filtered by active bike */}
            {!isLoading && (
              <SummaryCards
                overdueCount={filteredOverdue.length}
                dueCount={filteredAllTasks.length}
                completedCount={filteredCompletedCount}
                totalSavings={filteredSavings}
                currency={currency}
                currencyIconName={currencyIconName}
                completedProgress={yearlyStats ? (yearlyStats.totalThisYear > 0 ? yearlyStats.completedThisYear / yearlyStats.totalThisYear : 0) : undefined}
                savingsProgress={yearlyStats ? (yearlyStats.projectedSavings > 0 ? yearlyStats.savedThisYear / yearlyStats.projectedSavings : 0) : undefined}
                activeTab={activeMetricTab}
                onTabPress={setActiveMetricTab}
              />
            )}

            {/* ── Content based on active metric tab ── */}

            {/* Upcoming Tasks (default) */}
            {activeMetricTab === 'upcoming' && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
                </View>
                <View style={styles.taskList}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.green} />
                    </View>
                  ) : filteredTasks.filter((t) => t.status === 'due').length === 0 ? (
                    <EmptyUpcoming />
                  ) : (
                    filteredTasks.filter((t) => t.status === 'due').map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        bikeName={bikeNameMap.get(task.bikeId) ?? 'Unknown Bike'}
                        onPress={() => router.push(`/bike/${task.bikeId}?taskId=${task._id}` as any)}
                        onComplete={(id) => setTaskToComplete({ id, name: task.name })}
                        isCompleting={completingIds.has(task._id)}
                        currency={currency}
                      />
                    ))
                  )}
                </View>
              </>
            )}

            {/* Overdue Tasks */}
            {activeMetricTab === 'overdue' && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Overdue Tasks</Text>
                </View>
                <View style={styles.taskList}>
                  {filteredOverdue.length === 0 ? (
                    <EmptyOverdue />
                  ) : (
                    filteredOverdue.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        bikeName={bikeNameMap.get(task.bikeId) ?? 'Unknown Bike'}
                        onPress={() => router.push(`/bike/${task.bikeId}?taskId=${task._id}` as any)}
                        onComplete={(id) => setTaskToComplete({ id, name: task.name })}
                        isCompleting={completingIds.has(task._id)}
                        currency={currency}
                      />
                    ))
                  )}
                </View>
              </>
            )}

            {/* Completed Tasks */}
            {activeMetricTab === 'done' && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Completed Tasks</Text>
                </View>
                <View style={styles.taskList}>
                  {filteredCompleted.length === 0 ? (
                    <EmptyCompleted />
                  ) : (
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
                  )}
                </View>
              </>
            )}

            {/* Savings Breakdown */}
            {activeMetricTab === 'saved' && (
              <SavingsBreakdown
                savedThisYear={yearlyStats?.savedThisYear ?? 0}
                projectedSavings={yearlyStats?.projectedSavings ?? 0}
                partsSpentThisYear={yearlyStats?.partsSpentThisYear ?? 0}
                projectedPartsCost={yearlyStats?.projectedPartsCost ?? 0}
                mechanicCostThisYear={yearlyStats?.mechanicCostThisYear ?? 0}
                currency={currency}
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* TEMP: Test onboarding */}
      {true && (
        <>
          <TouchableOpacity
            style={styles.testOnboardingBtn}
            onPress={() => router.push('/onboarding' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.testOnboardingText}>Test Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testOnboardingBtn, {
              backgroundColor: currentUser?.subscriptionStatus === 'active' ? colors.green : colors.purple,
              bottom: 145,
            }]}
            onPress={async () => {
              const isActive = currentUser?.subscriptionStatus === 'active';
              await updateSubscription({
                subscriptionStatus: isActive ? 'free' : 'active',
                subscriptionPlan: isActive ? undefined : 'annual',
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.testOnboardingText}>
              {currentUser?.subscriptionStatus === 'active' ? 'Sub: PRO (tap to switch to Free)' : 'Sub: FREE (tap to switch to Pro)'}
            </Text>
          </TouchableOpacity>
        </>
      )}

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
              Mark <Text style={{ fontWeight: '700' }}>{taskToComplete?.name}</Text> as completed?
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120, gap: 16 },

  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // Hero wrapper — full bleed
  heroWrapper: {
    position: 'relative',
    marginBottom: -80,
  },
  heroTitle: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    zIndex: 10,
  },

  // Page dots for bike swiper
  pageDots: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pageDotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },

  // Dashboard content (padded)
  dashboardContent: { paddingHorizontal: 16, gap: 16 },

  // Section header
  sectionHeader: { paddingBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },

  // Task list
  taskList: {},
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // Empty tasks
  emptyTasksContainer: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40,
    backgroundColor: colors.surface1, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  emptyTasksTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  emptyTasksDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Empty garage
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIconWrapper: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, gap: 8,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: colors.surface2, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, width: '85%', maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalMessage: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // TEMP buttons
  testOnboardingBtn: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: colors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  testOnboardingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
