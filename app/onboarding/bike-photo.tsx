import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

export default function BikePhotoScreen() {
  const router = useRouter();
  const { setFields } = useOnboarding();
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResult.json();

      setFields({ photoStorageId: storageId, photoUrl: asset.uri });
      setUploaded(true);
    } catch (error) {
      if (__DEV__) console.error('Failed to upload photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/analysis');
  };

  const handleSkip = () => {
    router.push('/onboarding/analysis');
  };

  return (
    <OnboardingScreen
      step={14}
      title="Add a photo of your motorcycle"
      subtitle="We'll turn your bike into a custom visual for your dashboard."
    >
      <View style={styles.body}>
        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={colors.green} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => pickImage(true)}
            >
              <Text style={styles.actionButtonText}>Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => pickImage(false)}
            >
              <Text style={styles.actionButtonText}>Upload from gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {uploaded && (
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.8}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.skipButton}
          activeOpacity={0.7}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
