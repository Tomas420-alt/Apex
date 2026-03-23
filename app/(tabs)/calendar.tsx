import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';
import { MaintenanceCalendar } from '../../components/MaintenanceCalendar';

export default function CalendarScreen() {
  const router = useRouter();
  const bikes = (useQuery(api.bikes.list) ?? []) as {
    _id: Id<'bikes'>;
    make: string;
    model: string;
  }[];

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.make} ${bike.model}`);
    }
    return map;
  }, [bikes]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: colors.textPrimary,
          textAlign: 'center',
          marginTop: 8,
          marginBottom: 20,
        }}>
          Calendar
        </Text>

        <MaintenanceCalendar
          tasks={calendarTasks}
          bikeNameMap={bikeNameMap}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          onTaskPress={(bikeId, taskId) => router.push(`/bike/${bikeId}?taskId=${taskId}` as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
