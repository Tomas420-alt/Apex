import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import {
  Wrench,
  Calendar,
  Gauge,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  CircleDot,
  RefreshCw,
  Trash2,
  Plus,
  ChevronDown,
  History,
  Crown,
  Sparkles,
  Cpu,
  ClipboardCheck,
} from 'lucide-react-native';
import { GenerateButton } from '../../components/GenerateButton';
import { InspectionChecklist } from '../../components/InspectionChecklist';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { colors } from '@/constants/theme';

// ─── Background ─────────────────────────────────────────────────────────────

function DigitalGrid({ width, height }: { width: number; height: number }) {
  const spacing = 40;
  const c = 'rgba(0,242,255,0.045)';
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line key={`v${i}`} x1={i * spacing} y1={0} x2={i * spacing} y2={height} stroke={c} strokeWidth={1} />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * spacing} x2={width} y2={i * spacing} stroke={c} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}

function Background({ w, h }: { w: number; h: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.04" />
            <Stop offset="40%" stopColor="#00f2ff" stopOpacity="0.015" />
            <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={w - 350} y={-200} width={600} height={600} fill="url(#glow)" />
      </Svg>
      <DigitalGrid width={w} height={h} />
    </View>
  );
}

// ─── Frosted Glass Card ─────────────────────────────────────────────────────
// Matches the translucent card style used in calendar & pilot screens:
// rgba(255,255,255,0.04) bg + rgba(255,255,255,0.08) border + BlurView

function GlassCard({ children, style, radius = 16 }: { children: React.ReactNode; style?: any; radius?: number }) {
  return (
    <View style={[{ borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: '#1f2937' }, style]}>
      <BlurView intensity={15} tint="dark" style={{ backgroundColor: 'transparent' }}>
        {children}
      </BlurView>
    </View>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'due' | 'overdue' | 'completed' | 'skipped';

interface MaintenanceTask {
  _id: Id<'maintenanceTasks'>;
  name: string;
  description?: string;
  priority: string;
  status: string;
  intervalKm?: number;
  intervalMonths?: number;
  estimatedCostUsd?: number;
  dueDate?: string;
  dueMileage?: number;
  completedAt?: number;
  partsNeeded?: string[];
}

interface BikeDoc {
  _id: Id<'bikes'>;
  make: string;
  model: string;
  year: number;
  mileage: number;
  lastServiceDate?: string;
  lastServiceMileage?: number;
  notes?: string;
  inspectionStatus?: string;
  imageUrl?: string;
}

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; label: string }> = {
  critical: { bg: colors.priority.critical.bg, text: colors.priority.critical.text, label: 'Critical' },
  high: { bg: colors.priority.high.bg, text: colors.priority.high.text, label: 'High' },
  medium: { bg: colors.priority.medium.bg, text: colors.priority.medium.text, label: 'Medium' },
  low: { bg: colors.priority.low.bg, text: colors.priority.low.text, label: 'Low' },
};

const STATUS_CONFIG: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: colors.status.pending.bg, text: colors.status.pending.text, label: 'Pending' },
  due: { bg: colors.status.due.bg, text: colors.status.due.text, label: 'Due' },
  overdue: { bg: colors.status.overdue.bg, text: colors.status.overdue.text, label: 'Overdue' },
  completed: { bg: colors.status.completed.bg, text: colors.status.completed.text, label: 'Done' },
  skipped: { bg: colors.status.skipped.bg, text: colors.status.skipped.text, label: 'Skipped' },
};

// ─── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ task, onPress, currency }: { task: MaintenanceTask; onPress: () => void; currency: string }) {
  const priority = (task.priority as Priority) in PRIORITY_CONFIG ? (task.priority as Priority) : 'low';
  const status = (task.status as TaskStatus) in STATUS_CONFIG ? (task.status as TaskStatus) : 'pending';
  const pCfg = PRIORITY_CONFIG[priority];
  const sCfg = STATUS_CONFIG[status];
  const done = status === 'completed';

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', overflow: 'hidden', opacity: done ? 0.55 : 1 }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ width: 3, backgroundColor: pCfg.text }} />
      <View style={{ flex: 1, padding: 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: sCfg.bg }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: sCfg.text }}>{sCfg.label}</Text>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {task.dueDate && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) && (
            <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '500' }}>
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          )}
          {task.estimatedCostUsd ? (
            <Text style={{ fontSize: 11, color: colors.green, fontWeight: '500' }}>{currency}{task.estimatedCostUsd.toFixed(0)}</Text>
          ) : null}
          {task.partsNeeded && task.partsNeeded.length > 0 && (
            <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '500' }}>{task.partsNeeded.length} parts</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const currentUser = useQuery(api.users.getCurrent);
  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);
  const isSubscribed = currentUser?.subscriptionStatus === 'active';
  const { width: sw, height: sh } = useWindowDimensions();

  const [selectedBikeIndex, setSelectedBikeIndex] = useState(0);
  const selectedBike = bikes[selectedBikeIndex] ?? null;
  const bikeId = selectedBike?._id;

  const plan = useQuery(api.maintenancePlans.getByBike, bikeId ? { bikeId } : 'skip');
  const rawTasks = useQuery(api.maintenanceTasks.listByBike, bikeId ? { bikeId } : 'skip');
  const tasks = (rawTasks ?? []) as MaintenanceTask[];
  const yearlyStats = useQuery(api.maintenanceTasks.yearlyStats, bikeId ? { bikeId } : 'skip');
  const completionHistory = useQuery(api.maintenanceTasks.listCompletionHistory, bikeId ? { bikeId } : 'skip');
  const generatePlan = useMutation(api.bikes.generatePlan);
  const completeAndAdvance = useMutation(api.maintenanceTasks.completeAndAdvance);
  const removeBike = useMutation(api.bikes.remove);

  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<Id<'maintenanceTasks'> | null>(null);
  const [bikeToDelete, setBikeToDelete] = useState<BikeDoc | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const tasksSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!isGenerating || !rawTasks) return;
    const currentIds = rawTasks.map((t: MaintenanceTask) => t._id).join(',');
    if (rawTasks.length > 0 && currentIds !== tasksSnapshotRef.current) setIsGenerating(false);
  }, [rawTasks, isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => setIsGenerating(false), 60000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  const handleGeneratePlan = async () => {
    if (!bikeId) return;
    if (!isSubscribed) { router.push('/membership' as any); return; }
    tasksSnapshotRef.current = (rawTasks ?? []).map((t: MaintenanceTask) => t._id).join(',');
    setIsGenerating(true);
    try { await generatePlan({ bikeId }); }
    catch (error) {
      if (__DEV__) console.error('Failed to generate plan:', error);
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: Id<'maintenanceTasks'>) => {
    setCompletingTaskId(taskId);
    try { await completeAndAdvance({ id: taskId }); }
    catch (error) { if (__DEV__) console.error('Failed to complete task:', error); }
    finally { setCompletingTaskId(null); }
  };

  const handleViewParts = (taskId: Id<'maintenanceTasks'>, taskName: string) => {
    router.push(`/parts/${taskId}?taskName=${encodeURIComponent(taskName)}&bikeId=${bikeId}` as any);
  };

  const handleViewAllParts = () => {
    if (bikeId) router.push(`/parts/bike/${bikeId}` as any);
  };

  const confirmDeleteBike = async () => {
    if (!bikeToDelete) return;
    try {
      await removeBike({ id: bikeToDelete._id });
      if (selectedBikeIndex >= bikes.length - 1) setSelectedBikeIndex(Math.max(0, bikes.length - 2));
    } catch (error) { if (__DEV__) console.error('Failed to delete bike:', error); }
    setBikeToDelete(null);
  };

  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
  const sortedActive = [...activeTasks].sort((a, b) => {
    const am = a.dueMileage ?? Infinity;
    const bm = b.dueMileage ?? Infinity;
    if (am !== bm) return am - bm;
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  });

  const yearCompletedCount = yearlyStats?.completedThisYear ?? 0;
  const yearTotalCount = yearlyStats?.totalThisYear ?? 0;
  const yearProgress = yearTotalCount > 0 ? yearCompletedCount / yearTotalCount : 0;
  const yearRemaining = yearTotalCount - yearCompletedCount;

  // ── Empty: no bikes ──
  if (bikes.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Background w={sw} h={sh} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={32} color={colors.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, textTransform: 'uppercase', fontStyle: 'italic' }}>No Bikes Yet</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>Add a bike to generate a maintenance plan.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Background w={sw} h={sh} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 120, gap: 24 }} showsVerticalScrollIndicator={false}>

          {/* ── Header — matches Pilot Protocol placement ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: -2 }}>
            <Cpu size={20} color={colors.green} />
            <Text style={{ fontSize: 18, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: -0.5, color: colors.textPrimary }}>
              AI <Text style={{ color: colors.green }}>Protocol</Text>
            </Text>
          </View>

          {/* ── Bike chips ── */}
          {bikes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
              {bikes.map((bike, index) => (
                <TouchableOpacity
                  key={bike._id}
                  style={{
                    backgroundColor: selectedBikeIndex === index ? 'rgba(0,242,255,0.15)' : 'rgba(255,255,255,0.04)',
                    borderRadius: 20, borderCurve: 'continuous',
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: selectedBikeIndex === index ? colors.green : 'rgba(255,255,255,0.08)',
                  }}
                  onPress={() => setSelectedBikeIndex(index)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: selectedBikeIndex === index ? colors.green : colors.textSecondary }}>
                    {bike.make} {bike.model}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Unit Selector Card ── */}
          {/* HTML: bg-card/80 rounded-2xl border-gray-800 p-4 */}
          {selectedBike && (
            <View style={{ borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: '#1f2937', marginTop: 5 }}>
              <BlurView intensity={15} tint="dark" style={{ backgroundColor: 'transparent' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {/* HTML: w-12 h-12 bg-black rounded-lg border-gray-800 */}
                  <View style={{
                    width: 48, height: 48, borderRadius: 8, borderCurve: 'continuous',
                    backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f2937',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Image source={require('../../assets/images/motorcycle-icon.png')} style={{ width: 30, height: 30, tintColor: '#FFFFFF' }} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: colors.textPrimary, textTransform: 'uppercase', fontStyle: 'italic' }}>
                      {selectedBike.make} {selectedBike.model}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.6, marginTop: 2 }}>
                      {selectedBike.mileage.toLocaleString()} KM {'•'} Active
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setBikeToDelete(selectedBike)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={20} color="rgba(255,255,255,0.15)" />
                </TouchableOpacity>
              </View>
              </BlurView>
            </View>
          )}

          {/* ═══ Plan Content ═══ */}

          {/* Needs inspection (existing checklist) */}
          {bikeId && !plan && selectedBike && !selectedBike.lastServiceDate && selectedBike.inspectionStatus !== 'complete' ? (
            <>
              <InspectionChecklist bikeId={bikeId} inspectionStatus={selectedBike.inspectionStatus} isSubscribed={isSubscribed} />
              {!isSubscribed && <ManualInputButton />}
            </>

          /* Generating after inspection */
          ) : bikeId && !plan && selectedBike?.inspectionStatus === 'complete' ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Building your plan...</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Analyzing inspection results</Text>
            </View>

          /* ── No plan: Inspection Prompt ── */
          /* HTML: bg-card/90 rounded-[2.5rem] p-10 border-gray-800 */
          ) : bikeId && !plan ? (
            <>
              <View style={{
                borderRadius: 40, borderCurve: 'continuous', overflow: 'hidden',
                borderWidth: 1, borderColor: '#1f2937',
              }}>
                <BlurView intensity={15} tint="dark" style={{
                  backgroundColor: 'transparent',
                  padding: 40, alignItems: 'center',
                }}>
                  {/* Top neon gradient line — HTML: h-1 opacity-30 */}
                  <LinearGradient
                    colors={['transparent', '#00f2ff', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, opacity: 0.3 }}
                  />

                  {/* Icon: w-20 h-20 rounded-3xl pure black bg, no glow */}
                  <View style={{
                    width: 80, height: 80, borderRadius: 24, borderCurve: 'continuous',
                    backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f2937',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
                  }}>
                    <ClipboardCheck size={36} color={colors.green} strokeWidth={1.8} />
                  </View>

                  {/* Title — HTML: text-xl font-black uppercase italic mb-4 */}
                  <Text style={{
                    fontSize: 20, fontWeight: '900', color: colors.textPrimary,
                    textTransform: 'uppercase', fontStyle: 'italic',
                    textAlign: 'center', marginBottom: 16,
                  }}>
                    Initial Inspection Needed
                  </Text>

                  {/* Description — HTML: text-gray-500 text-xs leading-relaxed mb-10 */}
                  <Text style={{
                    fontSize: 12, color: '#6b7280', lineHeight: 20,
                    textAlign: 'center', marginBottom: 40,
                  }}>
                    {"Since there\u2019s no service history recorded for this unit, our AI requires a preliminary baseline. Complete the 12-point scan to generate your surgical maintenance plan."}
                  </Text>

                  {/* CTA button — HTML: w-full rounded-xl tracking-widest text-sm py-4 */}
                  <TouchableOpacity
                    style={{
                      width: '100%', backgroundColor: colors.green,
                      borderRadius: 12, borderCurve: 'continuous',
                      paddingVertical: 16, flexDirection: 'row',
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 0 20px rgba(0,242,255,0.4)',
                      opacity: isGenerating ? 0.6 : 1,
                    }}
                    onPress={handleGeneratePlan}
                    activeOpacity={0.85}
                    disabled={isGenerating}
                  >
                    {isGenerating && <ActivityIndicator size={18} color="#000" />}
                    <Text style={{
                      fontSize: 14, fontWeight: '800', color: '#000000',
                      textTransform: 'uppercase', letterSpacing: 2,
                    }}>
                      {isGenerating ? 'INITIALIZING...' : 'INITIALIZE INSPECTION'}
                    </Text>
                  </TouchableOpacity>
                </BlurView>
              </View>

              {/* Manual tasks if any */}
              {sortedActive.length > 0 && (
                <>
                  <SectionLabel>Your Tasks</SectionLabel>
                  <GlassCard radius={16}>
                    <View>
                      {sortedActive.map((task, i) => (
                        <View key={task._id}>
                          {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 14 }} />}
                          <TaskRow task={task} onPress={() => setSelectedTask(task)} currency={currency} />
                        </View>
                      ))}
                    </View>
                  </GlassCard>
                </>
              )}

              <ManualInputButton />
            </>

          /* Tasks loading */
          ) : bikeId && plan && tasks.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <Clock size={28} color={colors.textSecondary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Tasks loading...</Text>
            </View>

          /* ── Plan with tasks ── */
          ) : bikeId && plan ? (
            <>
              <View style={{ position: 'relative' }}>
                {/* Progress card */}
                <GlassCard radius={16} style={{ marginBottom: 24 }}>
                  <View style={{ padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{new Date().getFullYear()} Progress</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800' }}>
                        <Text style={{ color: colors.green, fontVariant: ['tabular-nums'] }}>{yearCompletedCount}</Text>
                        <Text style={{ color: colors.textTertiary }}>/{yearTotalCount}</Text>
                      </Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 2, backgroundColor: colors.green, width: `${Math.max(yearProgress * 100, 2)}%` as any }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderCurve: 'continuous', paddingVertical: 10 }}>
                        <Clock size={13} color={colors.orange} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{yearRemaining}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</Text>
                      </View>
                      {plan.nextServiceDate && (
                        <View style={{ flex: 1, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderCurve: 'continuous', paddingVertical: 10 }}>
                          <Calendar size={13} color={colors.blue} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{plan.nextServiceDate}</Text>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next Service</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderCurve: 'continuous', paddingVertical: 10 }}>
                        <CheckCircle2 size={13} color={colors.green} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{Math.round(yearProgress * 100)}%</Text>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Complete</Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>

                {/* Tasks */}
                <SectionLabel>Maintenance Tasks</SectionLabel>
                <GlassCard radius={16} style={{ marginTop: 12, marginBottom: 24 }}>
                  <View>
                    {sortedActive.map((task, i) => (
                      <Animated.View key={task._id} layout={Layout.springify()} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                        {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 14 }} />}
                        <TaskRow task={task} onPress={() => setSelectedTask(task)} currency={currency} />
                      </Animated.View>
                    ))}
                  </View>
                </GlassCard>

                {/* History */}
                {(completionHistory ?? []).length > 0 && (
                  <>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 }} onPress={() => setHistoryExpanded(!historyExpanded)} activeOpacity={0.7}>
                      <History size={14} color={colors.textTertiary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary }}>Completion History ({(completionHistory ?? []).length})</Text>
                      <Animated.View style={{ transform: [{ rotate: historyExpanded ? '180deg' : '0deg' }] }}>
                        <ChevronDown size={16} color={colors.textTertiary} />
                      </Animated.View>
                    </TouchableOpacity>
                    {historyExpanded && (
                      <Animated.View entering={FadeIn.duration(200)}>
                        <GlassCard radius={16} style={{ marginBottom: 24 }}>
                          <View>
                            {(completionHistory ?? []).map((entry, i) => (
                              <React.Fragment key={entry._id}>
                                {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 14 }} />}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <CheckCircle2 size={14} color={colors.green} />
                                    <View>
                                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{entry.taskName}</Text>
                                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>
                                        {new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {entry.dueDate ? ` · was due ${new Date(entry.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                                      </Text>
                                    </View>
                                  </View>
                                  {entry.estimatedLaborCostUsd ? (
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.green }}>+{currency}{Math.round(entry.estimatedLaborCostUsd)}</Text>
                                  ) : null}
                                </View>
                              </React.Fragment>
                            ))}
                          </View>
                        </GlassCard>
                      </Animated.View>
                    )}
                  </>
                )}

                {/* Bottom actions */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 14 }}
                    onPress={handleViewAllParts}
                    activeOpacity={0.8}
                  >
                    <Package size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>All Parts</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <GenerateButton label="Regenerate" loadingLabel="Regenerating" onPress={handleGeneratePlan} isLoading={isGenerating} variant="secondary" />
                  </View>
                </View>

                {/* Paywall */}
                {!isSubscribed && (
                  <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <View style={{ alignItems: 'center', paddingHorizontal: 32 }} pointerEvents="box-none">
                      <View style={{ width: 52, height: 52, borderRadius: 16, borderCurve: 'continuous', backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Crown size={26} color="#FFD700" />
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 }}>Upgrade to ApexTune Pro</Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 22 }}>
                        Unlock your full AI maintenance plan, task tracking, and parts lists.
                      </Text>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.green, borderRadius: 14, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: 40, boxShadow: '0 0 20px rgba(0,242,255,0.3)' }}
                        onPress={() => router.push('/membership' as any)}
                        activeOpacity={0.85}
                      >
                        <Sparkles size={16} color="#000000" />
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#000000' }}>Upgrade to Pro</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {!isSubscribed && <ManualInputButton />}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Delete Modal */}
      <Modal visible={bikeToDelete !== null} transparent animationType="fade" onRequestClose={() => setBikeToDelete(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={() => setBikeToDelete(null)}>
          <Pressable style={{ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '85%', maxWidth: 340, overflow: 'hidden', backgroundColor: colors.surface1 }} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Delete Bike</Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 }}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '700' }}>{bikeToDelete?.make} {bikeToDelete?.model}</Text>?
                This will also remove its maintenance plan and all tasks.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.surface2, alignItems: 'center' }} onPress={() => setBikeToDelete(null)} activeOpacity={0.7}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.red, alignItems: 'center' }} onPress={confirmDeleteBike} activeOpacity={0.7}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={selectedTask !== null} transparent animationType="fade" onRequestClose={() => setSelectedTask(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={() => setSelectedTask(null)}>
          <Pressable style={{ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '90%', maxWidth: 400, overflow: 'hidden', backgroundColor: colors.surface1 }} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 14 }}>
              {selectedTask && (() => {
                const pri = (selectedTask.priority as Priority) in PRIORITY_CONFIG ? (selectedTask.priority as Priority) : 'low';
                const stat = (selectedTask.status as TaskStatus) in STATUS_CONFIG ? (selectedTask.status as TaskStatus) : 'pending';
                const pCfg = PRIORITY_CONFIG[pri];
                const sCfg = STATUS_CONFIG[stat];
                const isDone = stat === 'completed';
                return (
                  <>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 3, borderRadius: 1.5, alignSelf: 'stretch', backgroundColor: pCfg.text }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, lineHeight: 22 }}>{selectedTask.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: pCfg.bg }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: pCfg.text }}>{pCfg.label}</Text>
                          </View>
                          <View style={{ borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: sCfg.bg }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sCfg.text }}>{sCfg.label}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {selectedTask.description && <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{selectedTask.description}</Text>}
                    <View>
                      {selectedTask.dueDate && /^\d{4}-\d{2}-\d{2}/.test(selectedTask.dueDate) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                          <Calendar size={13} color={colors.textTertiary} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Due</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{new Date(selectedTask.dueDate + 'T00:00:00').toLocaleDateString()}</Text>
                        </View>
                      )}
                      {selectedTask.dueMileage && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                          <Gauge size={13} color={colors.textTertiary} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Mileage</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTask.dueMileage.toLocaleString()} km</Text>
                        </View>
                      )}
                      {(selectedTask.intervalKm || selectedTask.intervalMonths) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                          <RefreshCw size={13} color={colors.textTertiary} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Interval</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                            {[selectedTask.intervalKm ? `${selectedTask.intervalKm.toLocaleString()} km` : null, selectedTask.intervalMonths ? `${selectedTask.intervalMonths} mo` : null].filter(Boolean).join(' / ')}
                          </Text>
                        </View>
                      )}
                      {selectedTask.estimatedCostUsd && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                          <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={13} color={colors.textTertiary} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, flex: 1 }}>Est. Cost</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.green }}>{currency}{selectedTask.estimatedCostUsd.toFixed(0)}</Text>
                        </View>
                      )}
                    </View>
                    {selectedTask.partsNeeded && selectedTask.partsNeeded.length > 0 && (
                      <View style={{ gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Parts Needed</Text>
                        {selectedTask.partsNeeded.map((part, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
                            <CircleDot size={8} color={colors.textTertiary} />
                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{part}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                      {isSubscribed && (
                        <TouchableOpacity
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(91,141,239,0.2)', borderRadius: 10, borderCurve: 'continuous', paddingVertical: 12, backgroundColor: 'rgba(91,141,239,0.1)' }}
                          onPress={() => { setSelectedTask(null); handleViewParts(selectedTask._id, selectedTask.name); }}
                          activeOpacity={0.7}
                        >
                          <Package size={14} color={colors.blue} />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.blue }}>View Parts</Text>
                        </TouchableOpacity>
                      )}
                      {!isDone && (
                        <TouchableOpacity
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.green, borderRadius: 10, borderCurve: 'continuous', paddingVertical: 12, opacity: completingTaskId === selectedTask._id ? 0.5 : 1 }}
                          onPress={() => { handleCompleteTask(selectedTask._id); setSelectedTask(null); }}
                          activeOpacity={0.7}
                          disabled={completingTaskId === selectedTask._id}
                        >
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#000000' }}>Mark Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                );
              })()}
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Small shared components ────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{
      fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase', letterSpacing: 3,
    }}>
      {children}
    </Text>
  );
}

function ManualInputButton() {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16, borderCurve: 'continuous',
        padding: 20, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 12,
      }}
      onPress={() => router.push('/add-task' as any)}
      activeOpacity={0.8}
    >
      <Plus size={16} color="#9ca3af" />
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2 }}>
        Input Service Manually
      </Text>
    </TouchableOpacity>
  );
}
