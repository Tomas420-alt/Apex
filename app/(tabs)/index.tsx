import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Bike, ChevronRight, Plus, Trash2, Wrench } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { MaintenanceCalendar } from '../../components/MaintenanceCalendar';

interface BikeDoc {
  _id: Id<'bikes'>;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  nextService?: string;
}

interface BikeCardProps {
  bike: BikeDoc;
  onPress: () => void;
  onDelete: () => void;
}

function BikeCard({ bike, onPress, onDelete }: BikeCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardTouchArea} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.cardIconContainer}>
          <Bike size={22} color={colors.green} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.bikeName}>
            {bike.make} {bike.model}
          </Text>
          <Text style={styles.bikeMeta}>
            {bike.year}
            {bike.mileage !== undefined ? ` • ${bike.mileage.toLocaleString()} km` : ''}
          </Text>
          {bike.nextService ? (
            <View style={styles.serviceBadge}>
              <Wrench size={11} color={colors.green} style={styles.serviceBadgeIcon} />
              <Text style={styles.serviceBadgeText}>Next: {bike.nextService}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color={colors.textTertiary} />
      </TouchableOpacity>
      <Pressable
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && { opacity: 0.5, backgroundColor: 'rgba(255,107,107,0.2)' },
        ]}
        onPress={() => {
          onDelete();
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Trash2 size={16} color={colors.red} />
      </Pressable>
    </View>
  );
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

export default function GarageScreen() {
  const router = useRouter();
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const removeBike = useMutation(api.bikes.remove);
  const [bikeToDelete, setBikeToDelete] = useState<BikeDoc | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Always start from the 1st of the current real month
  const calendarStartDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  // End date = 2 months ahead of whichever month the user is currently viewing
  const calendarEndDate = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const endMonth = new Date(y, m + 3, 0); // last day of viewed month + 2
    return `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}-${String(endMonth.getDate()).padStart(2, '0')}`;
  }, [calendarMonth]);

  const calendarTasks = useQuery(
    api.maintenanceTasks.listForCalendar,
    bikes.length > 0 ? { startDate: calendarStartDate, endDate: calendarEndDate } : 'skip'
  );

  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.make} ${bike.model}`);
    }
    return map;
  }, [bikes]);

  const handleBikePress = (id: Id<'bikes'>) => {
    router.push(`/bike/${id}` as any);
  };

  const handleAddBike = () => {
    router.push('/add-bike' as any);
  };

  const confirmDelete = async () => {
    if (!bikeToDelete) return;
    try {
      await removeBike({ id: bikeToDelete._id });
    } catch (error) {
      console.error('Failed to delete bike:', error);
    }
    setBikeToDelete(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLogo}>
            <Wrench size={22} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.title}>My Garage</Text>
            <Text style={styles.subtitle}>
              {bikes.length === 0
                ? 'No bikes added yet'
                : bikes.length === 1
                ? '1 bike'
                : `${bikes.length} bikes`}
            </Text>
          </View>
        </View>
      </View>

      {bikes.length === 0 ? (
        <EmptyGarage onAdd={handleAddBike} />
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {bikes.map((bike) => (
            <BikeCard
              key={bike._id}
              bike={bike}
              onPress={() => handleBikePress(bike._id)}
              onDelete={() => setBikeToDelete(bike)}
            />
          ))}

          {/* Maintenance Calendar */}
          <MaintenanceCalendar
            tasks={calendarTasks}
            bikeNameMap={bikeNameMap}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            onTaskPress={(bikeId, taskId) => router.push(`/bike/${bikeId}?taskId=${taskId}` as any)}
          />
        </ScrollView>
      )}

      {bikes.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddBike} activeOpacity={0.85}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* TEMP: Test onboarding — remove after testing */}
      <TouchableOpacity
        style={styles.testOnboardingBtn}
        onPress={() => router.push('/onboarding' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.testOnboardingText}>Test Onboarding</Text>
      </TouchableOpacity>

      <Modal
        visible={bikeToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBikeToDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBikeToDelete(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Delete Bike</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '700' }}>
                {bikeToDelete?.make} {bikeToDelete?.model}
              </Text>
              ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBikeToDelete(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
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
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginBottom: 12,
    overflow: 'visible',
  },
  cardTouchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bikeMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,229,153,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    zIndex: 10,
  },
  serviceBadgeIcon: {
    marginRight: 2,
  },
  serviceBadgeText: {
    fontSize: 11,
    color: colors.green,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testOnboardingBtn: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  testOnboardingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
