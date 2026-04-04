import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface Props {
  imageUrl?: string;
  heroImageUrl?: string;
  bikeName: string;
  mileage: number;
  onAddPhoto?: () => void;
}

export function MotorcycleHero({ imageUrl, heroImageUrl, bikeName, mileage, onAddPhoto }: Props) {
  // Prefer AI-generated hero image, fallback to raw upload
  const displayUrl = heroImageUrl || imageUrl;
  const { width, height: screenHeight } = useWindowDimensions();
  const imageHeight = screenHeight * 0.70;

  return (
    <View style={[styles.heroContainer, { width, height: imageHeight }]}>
      {displayUrl ? (
        <Image
          source={{ uri: displayUrl }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <TouchableOpacity
          style={styles.placeholder}
          onPress={onAddPhoto}
          activeOpacity={0.7}
        >
          <View style={styles.placeholderIcon}>
            <Camera size={28} color={colors.textTertiary} />
          </View>
          <Text style={styles.placeholderText}>Tap to add a photo</Text>
        </TouchableOpacity>
      )}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(5,5,5,0.15)',
          'rgba(5,5,5,0.45)',
          'rgba(5,5,5,0.75)',
          colors.bg,
        ]}
        locations={[0.0, 0.3, 0.55, 0.75, 0.95]}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={[styles.overlayBottom, { bottom: screenHeight * 0.13 + 4 }]} pointerEvents="none">
        <Text style={styles.bikeName}>{bikeName}</Text>
        <View style={styles.mileageContainer}>
          <Text style={styles.mileageNumber}>{mileage.toLocaleString()}</Text>
          <Text style={styles.mileageLabel} adjustsFontSizeToFit numberOfLines={1}>KILOMETERS</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: '50%',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bikeName: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mileageContainer: {
    alignItems: 'flex-end',
  },
  mileageNumber: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    transform: [{ skewX: '-4deg' }],
    color: colors.green,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mileageLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.textTertiary,
    marginTop: 1,
    alignSelf: 'stretch',
    textAlign: 'right',
  },
});
