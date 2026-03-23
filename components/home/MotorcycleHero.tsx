import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Gauge, Camera } from 'lucide-react-native';
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
  const { width } = useWindowDimensions();
  const imageHeight = width * 1.15;

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
        colors={['transparent', colors.bg]}
        locations={[0.45, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.overlayBottom} pointerEvents="none">
        <Text style={styles.bikeName}>{bikeName}</Text>
        <View style={styles.mileageBadge}>
          <Gauge size={16} color="#FFFFFF" />
          <Text style={styles.mileageText}>{mileage.toLocaleString()} km</Text>
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
    bottom: 0,
    height: '60%',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bikeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mileageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mileageText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
