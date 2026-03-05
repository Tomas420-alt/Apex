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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { router } from 'expo-router';

interface FormState {
  make: string;
  model: string;
  year: string;
  mileage: string;
  lastServiceDate: string;
  lastServiceMileage: string;
  notes: string;
}

const initialFormState: FormState = {
  make: '',
  model: '',
  year: '',
  mileage: '',
  lastServiceDate: '',
  lastServiceMileage: '',
  notes: '',
};

export default function AddBikeScreen() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);

  const addBike = useMutation(api.bikes.add);

  const updateField = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (!form.make.trim()) {
      Alert.alert('Validation Error', 'Make is required.');
      return false;
    }
    if (!form.model.trim()) {
      Alert.alert('Validation Error', 'Model is required.');
      return false;
    }
    if (!form.year.trim() || isNaN(Number(form.year))) {
      Alert.alert('Validation Error', 'A valid year is required.');
      return false;
    }
    if (!form.mileage.trim() || isNaN(Number(form.mileage))) {
      Alert.alert('Validation Error', 'A valid current mileage is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await addBike({
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        mileage: Number(form.mileage),
        lastServiceDate: form.lastServiceDate.trim() || undefined,
        lastServiceMileage: form.lastServiceMileage.trim()
          ? Number(form.lastServiceMileage)
          : undefined,
        notes: form.notes.trim() || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to add bike:', error);
      Alert.alert('Error', 'Failed to add bike. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Bike</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Make */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Make <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Honda, Yamaha, Kawasaki"
              placeholderTextColor="#9CA3AF"
              value={form.make}
              onChangeText={updateField('make')}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Model <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CBR600RR"
              placeholderTextColor="#9CA3AF"
              value={form.model}
              onChangeText={updateField('model')}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>

          {/* Year */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Year <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2023"
              placeholderTextColor="#9CA3AF"
              value={form.year}
              onChangeText={updateField('year')}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="next"
            />
          </View>

          {/* Current Mileage */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current Mileage (km) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12500"
              placeholderTextColor="#9CA3AF"
              value={form.mileage}
              onChangeText={updateField('mileage')}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          {/* Last Service Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Last Service Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={form.lastServiceDate}
              onChangeText={updateField('lastServiceDate')}
              returnKeyType="next"
            />
          </View>

          {/* Last Service Mileage */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Last Service Mileage (km)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10000"
              placeholderTextColor="#9CA3AF"
              value={form.lastServiceMileage}
              onChangeText={updateField('lastServiceMileage')}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional details about your bike..."
              placeholderTextColor="#9CA3AF"
              value={form.notes}
              onChangeText={updateField('notes')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Bike</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
