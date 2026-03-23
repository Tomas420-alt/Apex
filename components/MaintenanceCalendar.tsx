import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface CalendarTask {
  _id: string;
  name: string;
  priority: string;
  status: string;
  dueDate: string;
  bikeId: string;
}

interface Props {
  tasks: CalendarTask[] | undefined;
  bikeNameMap: Map<string, string>;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onTaskPress: (bikeId: string, taskId: string) => void;
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF6B6B',
  high: '#FF9F43',
  medium: '#A855F7',
  low: '#8E8EA0',
};

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Convert to MON=0 start
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getBorderColor(dayTasks: CalendarTask[]): string | null {
  if (!dayTasks || dayTasks.length === 0) return null;

  // Overdue always red
  if (dayTasks.some((t) => t.status === 'overdue')) return '#FF6B6B';

  // Highest priority wins
  let best = 0;
  let bestPriority = 'low';
  for (const t of dayTasks) {
    const rank = PRIORITY_RANK[t.priority] ?? 0;
    if (rank > best) {
      best = rank;
      bestPriority = t.priority;
    }
  }
  return PRIORITY_COLORS[bestPriority] ?? PRIORITY_COLORS.low;
}

function toIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function MaintenanceCalendar({
  tasks,
  bikeNameMap,
  currentMonth,
  onMonthChange,
  onTaskPress,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(() => getCalendarDays(year, month), [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    if (!tasks) return map;
    for (const t of tasks) {
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate ? tasksByDate.get(selectedDate) ?? [] : [];

  const handlePrev = () => {
    const d = new Date(year, month - 1, 1);
    onMonthChange(d);
    setSelectedDate(null);
  };

  const handleNext = () => {
    const d = new Date(year, month + 1, 1);
    onMonthChange(d);
    setSelectedDate(null);
  };

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Calendar size={18} color={colors.textPrimary} />
        <Text style={styles.sectionTitle}>Schedule</Text>
      </View>

      <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrev} hitSlop={12} activeOpacity={0.6}>
          <ChevronLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{year} / {month + 1}</Text>
        <TouchableOpacity onPress={handleNext} hitSlop={12} activeOpacity={0.6}>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label) => (
          <Text key={label} style={styles.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* Grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={ci} style={styles.dayCell} />;
            }

            const iso = toIso(year, month, day);
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const dayTasks = tasksByDate.get(iso);
            const borderColor = getBorderColor(dayTasks ?? []);

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.dayCell,
                  borderColor && !isToday && styles.dayCellWithTask,
                  borderColor && !isToday && { borderColor },
                  isToday && styles.dayCellToday,
                  isToday && borderColor && { borderColor },
                  isToday && isSelected && styles.dayCellTodaySelected,
                  isSelected && !isToday && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDate(isSelected ? null : iso)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && !isSelected && styles.dayTextToday,
                    (isSelected) && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected day tasks */}
      {selectedDate && (
        <View style={styles.taskList}>
          <Text style={styles.taskListDate}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>

          {selectedTasks.length === 0 ? (
            <Text style={styles.noTasksText}>No tasks on this day</Text>
          ) : (
            selectedTasks.map((task) => {
              const priorityColor =
                PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low;
              const statusCfg = colors.status[task.status];
              const bikeName = bikeNameMap.get(task.bikeId) ?? 'Unknown bike';

              return (
                <TouchableOpacity
                  key={task._id}
                  style={[styles.taskRow, { borderLeftColor: priorityColor }]}
                  onPress={() => onTaskPress(task.bikeId, task._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskName} numberOfLines={1}>
                      {task.name}
                    </Text>
                    <Text style={styles.taskBike}>{bikeName}</Text>
                  </View>
                  {statusCfg && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusCfg.bg },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusCfg.text }]}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  container: {
    backgroundColor: 'rgba(26,26,46,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCellWithTask: {
    // borderColor set dynamically
    borderWidth: 2,
  },
  dayCellToday: {
    backgroundColor: colors.bg,
    borderColor: colors.bg,
  },
  dayCellTodaySelected: {
    backgroundColor: colors.surface2,
  },
  dayCellSelected: {
    backgroundColor: colors.surface2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: colors.green,
    fontWeight: '700',
  },
  // Task list below calendar
  taskList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  taskListDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  noTasksText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    gap: 10,
  },
  taskInfo: {
    flex: 1,
    gap: 2,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  taskBike: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
