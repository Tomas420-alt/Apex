import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  CheckCircle,
  Shield,
  Zap,
  Clock,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';

function EmptyCard({ icon, title, subtitle, accentColor }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
}) {
  return (
    <View style={styles.cardOuter}>
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={[styles.iconGlow, { shadowColor: accentColor }]}>
          <View style={[styles.iconCircle, { borderColor: `${accentColor}30` }]}>
            {icon}
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      </BlurView>
    </View>
  );
}

export function EmptyUpcoming() {
  return (
    <EmptyCard
      icon={<Clock size={28} color={colors.orange} strokeWidth={1.5} />}
      title="All clear"
      subtitle="No tasks due in the next 7 days. Ride easy."
      accentColor={colors.orange}
    />
  );
}

export function EmptyOverdue() {
  return (
    <EmptyCard
      icon={<Shield size={28} color={colors.green} strokeWidth={1.5} />}
      title="Zero overdue"
      subtitle="Everything's on schedule. Your bike thanks you."
      accentColor={colors.green}
    />
  );
}

export function EmptyCompleted() {
  return (
    <EmptyCard
      icon={<Zap size={28} color={colors.orange} strokeWidth={1.5} />}
      title="Nothing completed yet"
      subtitle="Finish your first task to start tracking progress."
      accentColor={colors.orange}
    />
  );
}

export function EmptyGeneral() {
  return (
    <EmptyCard
      icon={<CheckCircle size={28} color={colors.textTertiary} strokeWidth={1.5} />}
      title="No maintenance tasks"
      subtitle="Generate a plan from the Plan tab to get started."
      accentColor={colors.textTertiary}
    />
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 32,
    gap: 10,
  },
  iconGlow: {
    marginBottom: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  accentBar: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
    opacity: 0.5,
  },
});
