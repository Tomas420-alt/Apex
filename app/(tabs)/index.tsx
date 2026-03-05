import React, { useState } from 'react';
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
          <Bike size={22} color="#10B981" />
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
              <Wrench size={11} color="#10B981" style={styles.serviceBadgeIcon} />
              <Text style={styles.serviceBadgeText}>Next: {bike.nextService}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <Pressable
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && { opacity: 0.5, backgroundColor: '#FEE2E2' },
        ]}
        onPress={() => {
          onDelete();
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Trash2 size={16} color="#EF4444" />
      </Pressable>
    </View>
  );
}

function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Bike size={48} color="#9CA3AF" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.title}>My Garage</Text>
        <Text style={styles.subtitle}>
          {bikes.length === 0
            ? 'No bikes added yet'
            : bikes.length === 1
            ? '1 bike'
            : `${bikes.length} bikes`}
        </Text>
        {/* TEMP TEST BUTTON - REMOVE AFTER TESTING */}
        <TouchableOpacity
          style={{ backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12, alignItems: 'center' }}
          onPress={() => router.push('/onboarding' as any)}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Test Onboarding</Text>
        </TouchableOpacity>
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
        </ScrollView>
      )}

      {bikes.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddBike} activeOpacity={0.85}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#ECFDF5',
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
    color: '#1F2937',
  },
  bikeMeta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
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
    color: '#10B981',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
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
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
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
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
