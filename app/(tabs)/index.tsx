import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Bike, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/constants/theme';
import { useBikeContext } from '@/hooks/useSelectedBike';
import { MotorcycleHero } from '../../components/home/MotorcycleHero';
import { SummaryCards, MetricTab } from '../../components/maintenance/SummaryCards';
import { TaskCard } from '../../components/maintenance/TaskCard';
import { CompletedSection } from '../../components/maintenance/CompletedSection';
import { SavingsBreakdown } from '../../components/home/SavingsBreakdown';
import { EmptyUpcoming, EmptyOverdue, EmptyCompleted, EmptyGeneral } from '../../components/home/EmptyStates';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';

/** Show just the model if make+model exceeds 11 chars */
function getDisplayBikeName(make: string, model: string): string {
  const full = `${make} ${model}`;
  return full.length > 11 ? model : full;
}

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
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);
  const updateBikeImageFromStorage = useMutation(api.bikes.updateBikeImageFromStorage);

  // Maintenance data (from old maintenance.tsx)
  const tasks = useQuery(api.maintenanceTasks.listDue);
  const allCompletionHistory = useQuery(api.maintenanceTasks.listAllCompletionHistory);
  const savings = useQuery(api.maintenanceTasks.totalSavings);
  const cleanupOrphaned = useMutation(api.maintenanceTasks.cleanupOrphaned);
  const yearlyStatsAll = useQuery(api.maintenanceTasks.yearlyStats, {});

  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);
  const isSubscribed = currentUser?.subscriptionStatus === 'active';

  // Cleanup orphaned tasks once on mount
  const hasCleanedUp = useRef(false);
  useEffect(() => {
    if (!hasCleanedUp.current && currentUser) {
      hasCleanedUp.current = true;
      cleanupOrphaned().catch((e: any) => { if (__DEV__) console.error(e); });
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
      if (__DEV__) console.error('Failed to upload image:', error);
    }
  };

  // Shared bike selection context
  const { bikes: bikesOrdered, selectedBikeIndex: activeBikeIndex, setSelectedBikeIndex: setActiveBikeIndex, selectedBike: activeBike, selectedBikeId, setHighlightTaskId } = useBikeContext();

  // State
  const [activeMetricTab, setActiveMetricTab] = useState<MetricTab>('upcoming');

  const yearlyStatsBike = useQuery(
    api.maintenanceTasks.yearlyStats,
    selectedBikeId ? { bikeId: selectedBikeId } : 'skip'
  );
  const yearlyStats = bikes.length > 1 ? yearlyStatsBike : yearlyStatsAll;

  const heroFlatListRef = useRef<FlatList>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
      map.set(bike._id, getDisplayBikeName(bike.make, bike.model));
    }
    return map;
  }, [bikes]);

  const isLoading = tasks === undefined || bikes.length === undefined;
  const overdueTasks = tasks?.filter((t) => t.status === 'overdue') ?? [];
  const dueTasks = tasks?.filter((t) => t.status === 'due') ?? [];
  const allTasks = [...overdueTasks, ...dueTasks].sort((a, b) => {
    return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
  });

  const filteredOverdue = selectedBikeId ? overdueTasks.filter((t) => t.bikeId === selectedBikeId) : overdueTasks;
  const filteredAllTasks = selectedBikeId ? allTasks.filter((t) => t.bikeId === selectedBikeId) : allTasks;
  const filteredTasks = selectedBikeId ? allTasks.filter((t) => t.bikeId === selectedBikeId) : allTasks;
  const filteredCompleted = selectedBikeId
    ? (allCompletionHistory ?? []).filter((t) => t.bikeId === selectedBikeId)
    : (allCompletionHistory ?? []);
  const filteredCompletedCount = yearlyStats?.completedThisYear ?? 0;
  const filteredSavings = yearlyStats?.savedThisYear ?? 0;

  const heroHeight = screenWidth * 1.15;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {bikes.length === 0 ? (
        <SafeAreaView style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>
            APEX<Text style={{ color: colors.green }}>TUNE</Text>
          </Text>
          <EmptyGarage onAdd={() => router.push('/add-bike' as any)} />
        </SafeAreaView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Hero image — absolute positioned behind everything */}
          <View style={[styles.heroWrapper, { height: screenHeight * 0.70 }]}>
            <FlatList
              ref={heroFlatListRef}
              data={bikesOrdered}
              horizontal
              pagingEnabled
              scrollEnabled={bikesOrdered.length > 1}
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
                    bikeName={getDisplayBikeName(item.make, item.model)}
                    mileage={item.mileage ?? 0}
                    onAddPhoto={() => handleAddBikePhoto(item._id)}
                  />
                </View>
              )}
            />
            {/* APEXTUNE logo — fixed, doesn't scroll */}
            <View style={[styles.logoContainer, { top: insets.top + 8 }]} pointerEvents="none">
              <Text style={styles.logoText}>
                APEX<Text style={{ color: colors.green }}>TUNE</Text>
              </Text>
            </View>
            {/* Page dots overlaying the hero */}
            {bikesOrdered.length > 1 && (
              <View style={[styles.pageDots, { top: insets.top + 16 }]}>
                {bikesOrdered.map((_, i) => (
                  <View key={i} style={[styles.pageDot, i === activeBikeIndex && styles.pageDotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* Spacer to push dashboard below hero overlap */}
          <View style={{ height: screenHeight * 0.57 + 11 }} />

          {/* ── Maintenance Dashboard ── */}
          <View style={[styles.dashboardContent, { flex: 1 }]}>
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

            {/* ── Card content ── */}
            <View style={[styles.cardContainerOuter, { flex: 1 }]}>
            <BlurView intensity={15} tint="dark" style={[styles.cardContainerBlur, { flex: 1 }]}>
              {/* Upcoming Tasks (default) */}
              {activeMetricTab === 'upcoming' && (
                <>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.green} />
                    </View>
                  ) : filteredTasks.filter((t) => t.status === 'due').length === 0 ? (
                    <EmptyUpcoming />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} nestedScrollEnabled>
                      {filteredTasks.filter((t) => t.status === 'due').map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onPress={() => {
                            setHighlightTaskId(task._id);
                            router.navigate('/(tabs)/plan' as any);
                          }}
                          currency={currency}
                          country={currentUser?.country}
                        />
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Overdue Tasks */}
              {activeMetricTab === 'overdue' && (
                <>
                  {filteredOverdue.length === 0 ? (
                    <EmptyOverdue />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} nestedScrollEnabled>
                      {filteredOverdue.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onPress={() => {
                            setHighlightTaskId(task._id);
                            router.navigate('/(tabs)/plan' as any);
                          }}
                          currency={currency}
                          country={currentUser?.country}
                        />
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Completed Tasks */}
              {activeMetricTab === 'done' && (
                <>
                  {filteredCompleted.length === 0 ? (
                    <EmptyCompleted />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} nestedScrollEnabled>
                      <CompletedSection
                        tasks={filteredCompleted.map((t) => ({
                          _id: t._id,
                          name: t.taskName,
                          completedAt: t.completedAt,
                          estimatedLaborCostUsd: t.estimatedLaborCostUsd,
                          bikeName: bikeNameMap.get(t.bikeId) ?? 'Unknown Bike',
                        }))}
                        currency={currency}
                      />
                    </ScrollView>
                  )}
                </>
              )}

              {/* Savings Breakdown */}
              {activeMetricTab === 'saved' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} nestedScrollEnabled>
                  <SavingsBreakdown
                    savedThisYear={yearlyStats?.savedThisYear ?? 0}
                    projectedSavings={yearlyStats?.projectedSavings ?? 0}
                    partsSpentThisYear={yearlyStats?.partsSpentThisYear ?? 0}
                    projectedPartsCost={yearlyStats?.projectedPartsCost ?? 0}
                    mechanicCostThisYear={yearlyStats?.mechanicCostThisYear ?? 0}
                    currency={currency}
                  />
                </ScrollView>
              )}
            </BlurView>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  screenTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // Hero wrapper — full bleed
  heroWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  // APEXTUNE logo — fixed over hero
  logoContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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

  // Dashboard content (padded, flex column)
  dashboardContent: { paddingHorizontal: 24, gap: 32, paddingBottom: 16, zIndex: 1 },

  // Section header
  sectionHeader: { paddingBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', fontStyle: 'italic', textTransform: 'uppercase', color: colors.textPrimary },

  // Fixed card shell with internal scroll
  cardContainerOuter: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  cardContainerBlur: {
    backgroundColor: 'transparent',
    padding: 16,
  },

  // Task list
  taskList: {},
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // Empty tasks
  emptyTasksContainer: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: '#1f2937',
  },
  emptyTasksTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  emptyTasksDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Empty garage
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIconWrapper: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, gap: 8,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

});
