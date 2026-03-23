import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface TestimonialCardProps {
  name: string;
  age: number;
  bike: string;
  quote: string;
  rating?: number;
}

export function TestimonialCard({
  name,
  age,
  bike,
  quote,
  rating = 5,
}: TestimonialCardProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {name}, {age}
          </Text>
          <Text style={styles.bike}>{bike}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Apex user</Text>
        </View>
      </View>

      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            color={i < rating ? colors.green : colors.textTertiary}
            fill={i < rating ? colors.green : 'transparent'}
          />
        ))}
      </View>

      <Text style={styles.quote}>"{quote}"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,229,153,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bike: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(0,229,153,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  stars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 12,
  },
  quote: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },
});
