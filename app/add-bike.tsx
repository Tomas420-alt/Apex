import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import PhotoUploadStep from '@/components/add-bike/PhotoUploadStep';
import EpicShotProcessing from '@/components/add-bike/EpicShotProcessing';
import EpicShotResult from '@/components/add-bike/EpicShotResult';

type AddBikeStep = 'photo' | 'processing' | 'result' | 'details';

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
  const [step, setStep] = useState<AddBikeStep>('photo');
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [epicShotUrl, setEpicShotUrl] = useState<string | null>(null);

  const addBike = useMutation(api.bikes.add);
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);
  const generateEpicPhoto = useAction(api.imageEditActions.generateEpicBikePhoto);

  const updateField = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelected = (uri: string) => {
    setOriginalUri(uri);
    setStep('processing');
  };

  // Upload photo and call AI when entering processing step
  useEffect(() => {
    if (step !== 'processing' || !originalUri) return;

    let cancelled = false;

    const processPhoto = async () => {
      try {
        // 1. Get upload URL
        const uploadUrl = await generateUploadUrl();

        // 2. Upload the image
        const response = await fetch(originalUri);
        const blob = await response.blob();

        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/jpeg' },
          body: blob,
        });

        if (!uploadResult.ok) {
          throw new Error('Failed to upload image');
        }

        const { storageId } = await uploadResult.json();

        // 3. Call the AI action
        const result = await generateEpicPhoto({ storageId });

        if (cancelled) return;

        if (result.editedUrl) {
          setEpicShotUrl(result.editedUrl);
          setStep('result');
        } else {
          throw new Error('No edited URL returned');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Epic shot failed:', error);
        Alert.alert(
          'Oops',
          'The Los Santos Customs crew had trouble with your photo. Want to try again?',
          [
            { text: 'Try Again', onPress: () => { setStep('photo'); } },
            { text: 'Skip', onPress: () => { setStep('details'); } },
          ]
        );
      }
    };

    processPhoto();

    return () => { cancelled = true; };
  }, [step, originalUri]);

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
        imageUrl: epicShotUrl || undefined,
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

  const handleBack = () => {
    if (step === 'details' && epicShotUrl) {
      setStep('result');
    } else if (step === 'result') {
      setStep('photo');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const headerTitle = step === 'photo' || step === 'processing' || step === 'result'
    ? 'Add Bike'
    : 'Bike Details';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header - hidden during processing */}
      {step !== 'processing' && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* Step 1: Photo Upload */}
      {step === 'photo' && (
        <PhotoUploadStep
          onPhotoSelected={handlePhotoSelected}
          onSkip={() => setStep('details')}
        />
      )}

      {/* Step 2: Processing */}
      {step === 'processing' && originalUri && (
        <EpicShotProcessing originalUri={originalUri} />
      )}

      {/* Step 3: Result */}
      {step === 'result' && epicShotUrl && (
        <EpicShotResult
          epicShotUrl={epicShotUrl}
          onAccept={() => setStep('details')}
          onRetake={() => {
            setEpicShotUrl(null);
            setOriginalUri(null);
            setStep('photo');
          }}
        />
      )}

      {/* Step 4: Bike Details Form */}
      {step === 'details' && (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Epic Shot Preview */}
            {epicShotUrl && (
              <View style={styles.epicPreviewContainer}>
                <Image source={{ uri: epicShotUrl }} style={styles.epicPreviewImage} />
              </View>
            )}

            {/* Make */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Make <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Honda, Yamaha, Kawasaki"
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
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
    fontWeight: '600',
    color: colors.textPrimary,
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
    paddingBottom: 120,
  },
  epicPreviewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,229,153,0.2)',
  },
  epicPreviewImage: {
    width: '100%',
    height: '100%',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: colors.red,
  },
  input: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: colors.green,
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
