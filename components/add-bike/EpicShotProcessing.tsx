import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/theme';

const LOADING_MESSAGES = [
  "Entering Los Santos Customs...",
  "Applying custom paint job...",
  "Installing neon underglow...",
  "Upgrading exhaust system...",
  "Buffing out the scratches...",
  "Your ride is almost ready...",
];

interface EpicShotProcessingProps {
  originalUri: string;
}

export default function EpicShotProcessing({ originalUri }: EpicShotProcessingProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: originalUri }} style={styles.image} />
        <View style={styles.overlay} />
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingTitle}>
          Sending your ride to{'\n'}Los Santos Customs...
        </Text>
        <Text style={styles.loadingMessage}>
          {LOADING_MESSAGES[messageIndex]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 280,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  loadingMessage: {
    fontSize: 15,
    color: colors.green,
    fontWeight: '500',
  },
});
