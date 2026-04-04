import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { CalendarClock, Wrench } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { MaintenanceCalendar } from '../../components/MaintenanceCalendar';

/** Subtle digital grid overlay */
function DigitalGrid({ width, height }: { width: number; height: number }) {
  const spacing = 40;
  const lineColor = 'rgba(0,242,255,0.03)';
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line
            key={`v${i}`}
            x1={i * spacing}
            y1={0}
            x2={i * spacing}
            y2={height}
            stroke={lineColor}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * spacing}
            x2={width}
            y2={height}
            stroke={lineColor}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const bikes = (useQuery(api.bikes.list) ?? []) as {
    _id: Id<'bikes'>;
    make: string;
    model: string;
  }[];

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendarStartDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const calendarEndDate = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const endMonth = new Date(y, m + 3, 0);
    return `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}-${String(endMonth.getDate()).padStart(2, '0')}`;
  }, [calendarMonth]);

  const calendarTasks = useQuery(
    api.maintenanceTasks.listForCalendar,
    bikes.length > 0 ? { startDate: calendarStartDate, endDate: calendarEndDate } : 'skip'
  );

  const currentUser = useQuery(api.users.getCurrent);

  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.make} ${bike.model}`);
    }
    return map;
  }, [bikes]);

  // Track whether the displayed month (mid-swipe) is the current month
  const now = new Date();
  const todayDate = now.getDate();
  const [showTodayBubble, setShowTodayBubble] = useState(false);

  const handleDisplayMonthChange = useCallback((isCurrent: boolean) => {
    setShowTodayBubble(!isCurrent);
  }, []);

  const handleGoToToday = () => {
    setCalendarMonth(new Date());
    setSelectedDate(null);
  };

  // Show tasks for selected date, or due/overdue tasks as default
  const activeObjectives = useMemo(() => {
    if (!calendarTasks) return [];
    if (selectedDate) {
      return calendarTasks.filter((t) => t.dueDate === selectedDate);
    }
    return calendarTasks
      .filter((t) => t.status === 'due' || t.status === 'overdue')
      .slice(0, 3);
  }, [calendarTasks, selectedDate]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Background ambient effects */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Top-left glow: HTML = top-[-50px] left-[-50px] 300x300 opacity 0.05 blur 100px */}
            <RadialGradient id="calGlowTopLeft" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.08" />
              <Stop offset="30%" stopColor="#00f2ff" stopOpacity="0.04" />
              <Stop offset="70%" stopColor="#00f2ff" stopOpacity="0.01" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
            {/* Bottom-right glow: HTML = bottom-[100px] right-[-100px] 250x250 opacity 0.10 blur 80px */}
            <RadialGradient id="calGlowBottomRight" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.07" />
              <Stop offset="30%" stopColor="#00f2ff" stopOpacity="0.03" />
              <Stop offset="70%" stopColor="#00f2ff" stopOpacity="0.01" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={-200} y={-250} width={600} height={600} fill="url(#calGlowTopLeft)" />
          <Rect x={screenWidth - 350} y={screenHeight - 500} width={550} height={550} fill="url(#calGlowBottomRight)" />
        </Svg>
        <DigitalGrid width={screenWidth} height={screenHeight} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.screenTitle}>Calendar</Text>

          {/* Schedule Protocol sub-header */}
          <View style={styles.subHeader}>
            <CalendarClock size={18} color={colors.green} />
            <Text style={styles.subHeaderText}>
              Schedule <Text style={{ color: colors.green }}>Protocol</Text>
            </Text>
          </View>

          {/* Calendar */}
          <MaintenanceCalendar
            tasks={calendarTasks ?? []}
            bikeNameMap={bikeNameMap}
            currentMonth={calendarMonth}
            onMonthChange={(m) => { setCalendarMonth(m); setSelectedDate(null); }}
            onTaskPress={() => router.push('/(tabs)/plan' as any)}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onDisplayMonthChange={handleDisplayMonthChange}
          />

          {/* Active Objectives */}
          {activeObjectives.length > 0 && (
            <View style={styles.objectivesSection}>
              <Text style={styles.objectivesTitle}>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  : 'Active Objectives'}
              </Text>
              <View style={styles.objectivesList}>
                {activeObjectives.map((task) => (
                  <View key={task._id} style={styles.objectiveCard}>
                    <View style={styles.objectiveInfo}>
                      <Text style={styles.objectiveName}>{task.name}</Text>
                      <Text style={styles.objectiveSubtitle}>
                        {bikeNameMap.get(task.bikeId) ?? 'Unknown bike'}
                      </Text>
                    </View>
                    <Wrench size={20} color={colors.green} style={{ opacity: 0.5 }} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Today bubble — only shows when navigated away from current month */}
      {showTodayBubble && (
        <TouchableOpacity
          style={styles.todayBubble}
          onPress={handleGoToToday}
          activeOpacity={0.8}
        >
          <Text style={styles.todayBubbleText}>{todayDate}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120, gap: 40 },

  // Header
  screenTitle: {
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.8,
  },
  subHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.textPrimary,
  },

  // Active Objectives
  objectivesSection: {
    gap: 16,
  },
  objectivesTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.4)',
  },
  objectivesList: {
    gap: 12,
  },
  objectiveCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderLeftWidth: 2,
    borderLeftColor: colors.green,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  objectiveInfo: {
    flex: 1,
    gap: 4,
  },
  objectiveName: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    color: colors.textPrimary,
  },
  objectiveSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },

  // Today bubble — bottom right
  todayBubble: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  todayBubbleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
});
