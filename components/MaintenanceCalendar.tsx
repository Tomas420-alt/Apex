import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
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
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  onDisplayMonthChange?: (isCurrentMonth: boolean) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INSET = 24; // horizontal inset for content within the card
const GRID_INSET = 12; // horizontal inset for grid items (gap between months = GRID_INSET * 2 = INSET)
const FIXED_ROWS = 6; // always render 6 week rows so card height is constant

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

const TOTAL_MONTHS = 1200;
const CENTER_INDEX = 600;

function getMonthForIndex(baseYear: number, baseMonth: number, index: number) {
  const offset = index - CENTER_INDEX;
  const d = new Date(baseYear, baseMonth + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Always pad to exactly 42 cells (6 rows) so all months have identical height
  while (cells.length < FIXED_ROWS * 7) cells.push(null);
  return cells;
}

function getDotColor(dayTasks: CalendarTask[]): string | null {
  if (!dayTasks || dayTasks.length === 0) return null;
  if (dayTasks.some((t) => t.status === 'overdue')) return '#FF6B6B';

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

/** Single month grid — receives full page width, applies its own horizontal inset */
const MonthGrid = React.memo(({
  year,
  month,
  todayIso,
  tasksByDate,
  selectedDate,
  onDateSelect,
  pageWidth,
}: {
  year: number;
  month: number;
  todayIso: string;
  tasksByDate: Map<string, CalendarTask[]>;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  pageWidth: number;
}) => {
  const cells = getCalendarDays(year, month);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={{ width: pageWidth, paddingHorizontal: GRID_INSET, paddingTop: 14, paddingBottom: 14 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.weekRow, ri === rows.length - 1 && { marginBottom: 0 }]}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={ci} style={styles.dayCell} />;
            }

            const iso = toIso(year, month, day);
            const isToday = iso === todayIso;
            const dayTasks = tasksByDate.get(iso);
            const dotColor = getDotColor(dayTasks ?? []);
            const isSelected = iso === selectedDate;

            return (
              <TouchableOpacity
                key={ci}
                style={styles.dayCell}
                onPress={() => onDateSelect(isSelected ? null : iso)}
                activeOpacity={0.6}
              >
                {isToday ? (
                  <>
                    <Svg width={70} height={70} style={{ position: 'absolute' }}>
                      <Defs>
                        <RadialGradient id="todayGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                          <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.55" />
                          <Stop offset="35%" stopColor="#00f2ff" stopOpacity="0.3" />
                          <Stop offset="65%" stopColor="#00f2ff" stopOpacity="0.1" />
                          <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Circle cx={35} cy={35} r={35} fill="url(#todayGlow)" />
                    </Svg>
                    <View style={styles.todayHighlight}>
                      <Text style={styles.todayText}>{day}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                )}
                {dotColor && !isToday && (
                  <View style={[styles.taskDot, { backgroundColor: dotColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

export function MaintenanceCalendar({
  tasks,
  bikeNameMap,
  currentMonth,
  onMonthChange,
  onTaskPress,
  selectedDate,
  onDateSelect,
  onDisplayMonthChange,
}: Props) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const baseRef = useRef({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const baseYear = baseRef.current.year;
  const baseMonth = baseRef.current.month;

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());

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

  const currentIndex = CENTER_INDEX + (year - baseYear) * 12 + (month - baseMonth);

  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  const displayMonth = getMonthForIndex(baseYear, baseMonth, displayIndex);
  const monthDisplay = `${displayMonth.year} / ${String(displayMonth.month + 1).padStart(2, '0')}`;

  // Measure the FlatList's actual width — the single source of truth for paging
  const [pageWidth, setPageWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  // true when the scroll triggered the month change (swipe or button)
  // false when month changed externally (today bubble)
  const scrollDrivenRef = useRef(false);
  const prevCurrentIndex = useRef(currentIndex);

  const handleFlatListLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== pageWidth) setPageWidth(w);
  }, [pageWidth]);

  const data = useMemo(() => Array.from({ length: TOTAL_MONTHS }, (_, i) => i), []);

  // The index that represents the real "now" month (never changes)
  const todayIndex = useRef(CENTER_INDEX).current;

  // Notify parent when display month changes (via useEffect to avoid setState-during-render)
  useEffect(() => {
    onDisplayMonthChange?.(displayIndex === todayIndex);
  }, [displayIndex, todayIndex, onDisplayMonthChange]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setDisplayIndex((prev) => (prev !== index ? index : prev));
  }, [pageWidth]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (index === currentIndex) return;

    scrollDrivenRef.current = true;
    const { year: ny, month: nm } = getMonthForIndex(baseYear, baseMonth, index);
    onMonthChange(new Date(ny, nm, 1));
  }, [currentIndex, pageWidth, baseYear, baseMonth, onMonthChange]);

  const goPrev = useCallback(() => {
    flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  }, [currentIndex]);

  // Sync scroll position only for external month changes (today bubble)
  if (prevCurrentIndex.current !== currentIndex) {
    if (!scrollDrivenRef.current && pageWidth > 0) {
      // External change — scroll hasn't moved yet, need to jump
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
        setDisplayIndex(currentIndex);
      });
    }
    scrollDrivenRef.current = false;
    prevCurrentIndex.current = currentIndex;
  }

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: pageWidth,
    offset: pageWidth * index,
    index,
  }), [pageWidth]);

  const renderItem = useCallback(({ item: index }: { item: number }) => {
    const { year: mYear, month: mMonth } = getMonthForIndex(baseYear, baseMonth, index);
    return (
      <MonthGrid
        year={mYear}
        month={mMonth}
        todayIso={todayIso}
        tasksByDate={tasksByDate}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        pageWidth={pageWidth}
      />
    );
  }, [baseYear, baseMonth, todayIso, tasksByDate, selectedDate, onDateSelect, pageWidth]);

  return (
    <View style={styles.containerOuter}>
      <BlurView intensity={15} tint="dark" style={styles.containerBlur}>
        {/* Month nav — inset */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goPrev} hitSlop={12} activeOpacity={0.6}>
            <ChevronLeft size={24} color={colors.textTertiary} />
          </TouchableOpacity>
          <Text key={monthDisplay} style={styles.title}>{monthDisplay}</Text>
          <TouchableOpacity onPress={goNext} hitSlop={12} activeOpacity={0.6}>
            <ChevronRight size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Day labels — inset */}
        <View style={styles.dayLabelsRow}>
          {DAY_LABELS.map((label) => (
            <Text key={label} style={styles.dayLabel}>{label}</Text>
          ))}
        </View>

        {/* Swipeable month grid */}
        <View onLayout={handleFlatListLayout}>
          {pageWidth > 0 && (
            <FlatList
              ref={flatListRef}
              data={data}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScrollEnd}
              getItemLayout={getItemLayout}
              initialScrollIndex={currentIndex}
              windowSize={5}
              maxToRenderPerBatch={3}
              keyExtractor={(item) => String(item)}
              renderItem={renderItem}
            />
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  // NO padding on the container — FlatList spans edge to edge
  containerOuter: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  containerBlur: {
    backgroundColor: 'transparent',
    paddingTop: 24,
    paddingBottom: 24,
  },
  // Header and day labels use their own horizontal inset
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: INSET,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: colors.textPrimary,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingHorizontal: GRID_INSET,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textTertiary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.green,
  },
  todayHighlight: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000000',
  },
  taskDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
