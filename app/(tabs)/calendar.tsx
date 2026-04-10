import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { CalendarClock, Wrench } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { MaintenanceCalendar } from '../../components/MaintenanceCalendar';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { useBikeContext } from '@/hooks/useSelectedBike';
import { getCurrencySymbol } from '../../utils/currency';

/** Subtle digital grid overlay */
function DigitalGrid({ width, height }: { width: number; height: number }) {
  const spacing = 40;
  const lineColor = 'rgba(0,242,255,0.05)';
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} pointerEvents="none">
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
            y2={i * spacing}
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
  const { bikes, selectedBikeId } = useBikeContext();
  const currentUser = useQuery(api.users.getCurrent);
  const currency = getCurrencySymbol(currentUser?.country);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Task detail modal — stores the bikeId to look up full task data
  const [selectedCalTask, setSelectedCalTask] = useState<{ _id: string; bikeId: string } | null>(null);
  const selectedBikeIdForModal = selectedCalTask?.bikeId as Id<'bikes'> | undefined;
  const fullTasksForBike = useQuery(
    api.maintenanceTasks.listByBike,
    selectedBikeIdForModal ? { bikeId: selectedBikeIdForModal } : 'skip'
  );
  // Look up the full task by base ID (strip _rN suffix for projected recurring tasks)
  const selectedFullTask = useMemo(() => {
    if (!selectedCalTask || !fullTasksForBike) return null;
    const baseId = selectedCalTask._id.replace(/_r\d+$/, '');
    return fullTasksForBike.find((t: any) => t._id === baseId) ?? null;
  }, [selectedCalTask, fullTasksForBike]);

  const completeAndAdvance = useMutation(api.maintenanceTasks.completeAndAdvance);
  const [completingTaskId, setCompletingTaskId] = useState<Id<'maintenanceTasks'> | null>(null);
  const handleCompleteTask = async (taskId: Id<'maintenanceTasks'>) => {
    setCompletingTaskId(taskId);
    try { await completeAndAdvance({ id: taskId }); }
    catch (error) { if (__DEV__) console.error('Failed to complete task:', error); }
    finally { setCompletingTaskId(null); }
  };
  const handleViewParts = (taskId: Id<'maintenanceTasks'>, taskName: string) => {
    router.push(`/parts/${taskId}?taskName=${encodeURIComponent(taskName)}&bikeId=${selectedCalTask?.bikeId}` as any);
  };
  const isSubscribed = currentUser?.subscriptionStatus === 'active';

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

  const allCalendarTasks = useQuery(
    api.maintenanceTasks.listForCalendar,
    bikes.length > 0 ? { startDate: calendarStartDate, endDate: calendarEndDate } : 'skip'
  );

  // Filter calendar tasks to selected bike — keep previous data while query reloads
  const prevTasksRef = useRef<typeof allCalendarTasks>(undefined);
  const calendarTasks = useMemo(() => {
    const source = allCalendarTasks ?? prevTasksRef.current;
    if (!source) return undefined;
    if (allCalendarTasks) prevTasksRef.current = allCalendarTasks;
    if (!selectedBikeId) return source;
    return source.filter((t) => t.bikeId === selectedBikeId);
  }, [allCalendarTasks, selectedBikeId]);

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
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.05" />
              <Stop offset="35%" stopColor="#00f2ff" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="calGlowBottomRight" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.05" />
              <Stop offset="25%" stopColor="#00f2ff" stopOpacity="0.025" />
              <Stop offset="55%" stopColor="#00f2ff" stopOpacity="0.01" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={-200} y={-250} width={600} height={600} fill="url(#calGlowTopLeft)" />
          <Rect x={screenWidth - 320} y={screenHeight - 500} width={620} height={620} fill="url(#calGlowBottomRight)" />
        </Svg>
        <DigitalGrid width={screenWidth} height={screenHeight} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Fixed: Header + Calendar + Section title */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CalendarClock size={20} color={colors.green} />
            <Text style={{ fontSize: 18, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: -0.5, color: colors.textPrimary }}>
              Schedule <Text style={{ color: colors.green }}>Protocol</Text>
            </Text>
          </View>

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

          {activeObjectives.length > 0 && (
            <Text style={styles.objectivesTitle}>
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                : 'Active Objectives'}
            </Text>
          )}
        </View>

        {/* Scrollable: task cards */}
        {activeObjectives.length > 0 && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 12, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
            {activeObjectives.map((task) => {
              const priorityColor = colors.priority[task.priority]?.text ?? colors.textTertiary;
              return (
                <TouchableOpacity key={task._id} style={[styles.objectiveCard, { borderLeftColor: priorityColor }]} onPress={() => setSelectedCalTask({ _id: task._id, bikeId: task.bikeId })} activeOpacity={0.7}>
                  <View style={styles.objectiveInfo}>
                    <Text style={styles.objectiveName}>{task.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {task.estimatedCostUsd ? (
                        <Text style={styles.objectiveSubtitle}>{currency}{task.estimatedCostUsd.toFixed(0)}</Text>
                      ) : null}
                      {task.partsCount > 0 ? (
                        <Text style={styles.objectiveSubtitle}>{task.partsCount} parts</Text>
                      ) : null}
                      {!task.estimatedCostUsd && task.partsCount === 0 ? (
                        <Text style={styles.objectiveSubtitle}>No parts needed</Text>
                      ) : null}
                    </View>
                  </View>
                  <Wrench size={20} color={priorityColor} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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

      {/* Task Detail Modal — uses shared component with full task data */}
      <TaskDetailModal
        task={selectedFullTask}
        onClose={() => setSelectedCalTask(null)}
        currency={currency}
        country={currentUser?.country}
        onViewParts={handleViewParts}
        onComplete={handleCompleteTask}
        completingTaskId={completingTaskId}
        isSubscribed={isSubscribed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  objectivesTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.4)',
  },
  objectiveCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderLeftWidth: 2,
    borderLeftColor: colors.textTertiary,
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
