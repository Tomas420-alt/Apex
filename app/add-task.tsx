import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { router } from 'expo-router';
import { Id } from '../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: colors.textSecondary,
  medium: colors.purple,
  high: colors.orange,
  critical: colors.red,
};

export default function AddTaskScreen() {
  const bikes = useQuery(api.bikes.list) ?? [];
  const addTask = useMutation(api.maintenanceTasks.addManual);

  const [selectedBikeId, setSelectedBikeId] = useState<Id<'bikes'> | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueMileage, setDueMileage] = useState('');
  const [intervalKm, setIntervalKm] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first bike
  const bikeId = selectedBikeId ?? bikes[0]?._id ?? null;

  const canSave = name.trim().length > 0 && bikeId;

  const handleSave = async () => {
    if (!canSave || !bikeId) return;
    setIsSaving(true);
    try {
      await addTask({
        bikeId,
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate.trim() || undefined,
        dueMileage: dueMileage ? Number(dueMileage) : undefined,
        intervalKm: intervalKm ? Number(intervalKm) : undefined,
        intervalMonths: intervalMonths ? Number(intervalMonths) : undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to add task:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Task</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bike selector (if multiple bikes) */}
          {bikes.length > 1 && (
            <View style={styles.field}>
              <Text style={styles.label}>Bike</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {bikes.map((bike: any) => (
                    <TouchableOpacity
                      key={bike._id}
                      style={[styles.bikeChip, bikeId === bike._id && styles.bikeChipActive]}
                      onPress={() => setSelectedBikeId(bike._id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.bikeChipText, bikeId === bike._id && styles.bikeChipTextActive]}>
                        {bike.make} {bike.model}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Task name */}
          <View style={styles.field}>
            <Text style={styles.label}>Task Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Oil change, Chain adjustment"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional notes or details"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    priority === p && { backgroundColor: `${PRIORITY_COLORS[p]}20`, borderColor: PRIORITY_COLORS[p] },
                  ]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p && { color: PRIORITY_COLORS[p] },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due date */}
          <View style={styles.field}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Due mileage */}
          <View style={styles.field}>
            <Text style={styles.label}>Due Mileage (km)</Text>
            <TextInput
              style={styles.input}
              value={dueMileage}
              onChangeText={setDueMileage}
              placeholder="e.g. 15000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          </View>

          {/* Interval section */}
          <Text style={styles.sectionLabel}>Recurring Interval</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Every (km)</Text>
              <TextInput
                style={styles.input}
                value={intervalKm}
                onChangeText={setIntervalKm}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Every (months)</Text>
              <TextInput
                style={styles.input}
                value={intervalMonths}
                onChangeText={setIntervalMonths}
                placeholder="e.g. 6"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Add Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  // Content
  scrollContent: { padding: 16, paddingBottom: 24, gap: 4 },

  field: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 15, fontWeight: '700', color: colors.textPrimary,
    marginBottom: 12, marginTop: 8,
  },

  input: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 13,
  },

  // Bike selector
  chipRow: { flexDirection: 'row', gap: 8 },
  bikeChip: {
    backgroundColor: colors.surface1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bikeChipActive: {
    backgroundColor: 'rgba(0,229,153,0.15)',
    borderColor: colors.green,
  },
  bikeChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  bikeChipTextActive: { color: colors.green },

  // Priority
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  // Row
  row: { flexDirection: 'row', gap: 12 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
