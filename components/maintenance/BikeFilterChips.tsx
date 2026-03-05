import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Id } from '../../convex/_generated/dataModel';

interface BikeFilterChipsProps {
  bikes: { _id: Id<'bikes'>; make: string; model: string }[];
  selectedBikeId: Id<'bikes'> | null;
  onSelect: (bikeId: Id<'bikes'> | null) => void;
}

export function BikeFilterChips({ bikes, selectedBikeId, onSelect }: BikeFilterChipsProps) {
  if (bikes.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.chip, selectedBikeId === null && styles.chipSelected]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, selectedBikeId === null && styles.chipTextSelected]}>
          All Bikes
        </Text>
      </TouchableOpacity>
      {bikes.map((bike) => {
        const isSelected = selectedBikeId === bike._id;
        return (
          <TouchableOpacity
            key={bike._id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(bike._id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {bike.make} {bike.model}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#1F2937',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
