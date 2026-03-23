import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

interface BikeFilterChipsProps {
  bikes: { _id: Id<'bikes'>; make: string; model: string }[];
  selectedBikeId: Id<'bikes'> | null;
  onSelect: (bikeId: Id<'bikes'> | null) => void;
}

function FrostedChip({ label, isSelected, onPress }: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <BlurView
        intensity={isSelected ? 40 : 20}
        tint="dark"
        style={[styles.chip, isSelected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {label}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}

export function BikeFilterChips({ bikes, selectedBikeId, onSelect }: BikeFilterChipsProps) {
  if (bikes.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <FrostedChip
        label="All Bikes"
        isSelected={selectedBikeId === null}
        onPress={() => onSelect(null)}
      />
      {bikes.map((bike) => (
        <FrostedChip
          key={bike._id}
          label={`${bike.make} ${bike.model}`}
          isSelected={selectedBikeId === bike._id}
          onPress={() => onSelect(bike._id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textPrimary,
  },
});
