import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Radar,
  ShieldCheck,
  Crosshair,
  Navigation,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';

function EmptyCard({ icon, title, subtitle, accentColor, statusLabel }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
  statusLabel: string;
}) {
  return (
    <View style={styles.cardOuter}>
      <View style={styles.card}>
        {/* Top status bar */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.statusLabel, { color: accentColor }]}>{statusLabel}</Text>
        </View>

        {/* Icon + content */}
        <View style={styles.contentRow}>
          <View style={[styles.iconBox, { borderColor: `${accentColor}20` }]}>
            {icon}
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {/* Bottom accent line */}
        <View style={styles.accentLineTrack}>
          <View style={[styles.accentLineFill, { backgroundColor: accentColor }]} />
        </View>
      </View>
    </View>
  );
}

export function EmptyUpcoming() {
  return (
    <EmptyCard
      icon={<Radar size={22} color={colors.green} strokeWidth={1.5} />}
      title="All clear"
      subtitle="No tasks due in the next 7 days"
      accentColor={colors.green}
      statusLabel="SCANNING"
    />
  );
}

export function EmptyOverdue() {
  return (
    <EmptyCard
      icon={<ShieldCheck size={22} color={colors.green} strokeWidth={1.5} />}
      title="Zero overdue"
      subtitle="All systems nominal"
      accentColor={colors.green}
      statusLabel="NOMINAL"
    />
  );
}

export function EmptyCompleted() {
  return (
    <EmptyCard
      icon={<Crosshair size={22} color={colors.textTertiary} strokeWidth={1.5} />}
      title="Nothing logged"
      subtitle="Complete your first task to track progress"
      accentColor={colors.textTertiary}
      statusLabel="STANDBY"
    />
  );
}

export function EmptyGeneral() {
  return (
    <EmptyCard
      icon={<Navigation size={22} color={colors.textTertiary} strokeWidth={1.5} />}
      title="No active tasks"
      subtitle="Generate a plan to get started"
      accentColor={colors.textTertiary}
      statusLabel="OFFLINE"
    />
  );
}

const styles = StyleSheet.create({
  cardOuter: {
  },
  card: {
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  accentLineTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  accentLineFill: {
    width: '30%',
    height: '100%',
    borderRadius: 1,
    opacity: 0.6,
  },
});
