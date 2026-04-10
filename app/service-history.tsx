import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import {
  ArrowLeft,
  Download,
  Share2,
  Wrench,
  Brain,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';

// Tasks to exclude from the printable service history
const EXCLUDED_TASKS = [
  'wash', 'corrosion', 'rinse', 'protect',
  'chain clean', 'chain lube', 'chain tension',
  'tire pressure', 'tyre pressure',
  'initial inspection', 'inspection checklist',
  'quick visual', 'safety check', 'visual safety',
];

function shouldExcludeTask(name: string): boolean {
  const lower = name.toLowerCase();
  if (EXCLUDED_TASKS.some((exc) => lower.includes(exc))) return true;
  if (lower.includes('measurement') || lower.includes('check')) return true;
  return false;
}

// Clean up task names — make them definitive instead of conditional
function cleanTaskName(name: string): string {
  let cleaned = name;
  cleaned = cleaned.replace(/\s*\(replace if (?:necessary|needed|required)\)/gi, ' - Replaced');
  cleaned = cleaned.replace(/\s*\((?:replace|change) (?:if |as )?\w+\)/gi, ' - Replaced');
  cleaned = cleaned.replace(/inspection\/cleaning/gi, 'Replaced');
  cleaned = cleaned.replace(/inspection \/ cleaning/gi, 'Replaced');
  cleaned = cleaned.replace(/inspect(?:ion)? (?:and|&) clean(?:ing)?/gi, 'Cleaned & Inspected');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1FFFF}]/gu, '');
  return cleaned.trim();
}

// A4 aspect ratio: 1 : 1.4142
const A4_RATIO = 1.4142;
// Approximate how many rows fit per page (header takes space on first page)
const ROWS_PER_FIRST_PAGE = 18;
const ROWS_PER_CONTINUATION_PAGE = 26;

/** Split all entries into pages that fit the A4 layout */
function paginateEntries(
  groupedByBike: { bikeId: string; bikeName: string; entries: any[] }[],
  showFakeData: boolean,
  fakeEntries: { name: string; date: string }[],
  fakeBikeName: string,
) {
  // Flatten all entries with bike headers as separators
  const flat: { type: 'bikeHeader' | 'tableHeader' | 'row' | 'summary'; data: any }[] = [];

  if (showFakeData) {
    flat.push({ type: 'bikeHeader', data: { bikeName: fakeBikeName } });
    flat.push({ type: 'tableHeader', data: null });
    fakeEntries.forEach((e, i) => flat.push({ type: 'row', data: { ...e, index: i } }));
    flat.push({ type: 'summary', data: { count: fakeEntries.length } });
  } else {
    for (const group of groupedByBike) {
      flat.push({ type: 'bikeHeader', data: { bikeName: group.bikeName } });
      flat.push({ type: 'tableHeader', data: null });
      group.entries.forEach((e, i) => flat.push({ type: 'row', data: { ...e, index: i } }));
      flat.push({ type: 'summary', data: { count: group.entries.length } });
    }
  }

  // Split into pages
  const pages: typeof flat[] = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < flat.length) {
    const limit = pageIndex === 0 ? ROWS_PER_FIRST_PAGE : ROWS_PER_CONTINUATION_PAGE;
    pages.push(flat.slice(cursor, cursor + limit));
    cursor += limit;
    pageIndex++;
  }

  // Ensure at least one page (for empty state)
  if (pages.length === 0) pages.push([]);

  return pages;
}

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrent);
  const bikes = useQuery(api.bikes.list) ?? [];
  const history = useQuery(api.maintenanceTasks.listAllCompletionHistory) ?? [];
  const viewShotRef = useRef<ViewShot>(null);
  const [saving, setSaving] = React.useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const docWidth = screenWidth - 32; // 16px padding each side
  const docHeight = docWidth * A4_RATIO;

  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.year} ${(bike as any).make} ${(bike as any).model}`);
    }
    return map;
  }, [bikes]);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => !shouldExcludeTask(h.taskName));
  }, [history]);

  const groupedByBike = useMemo(() => {
    const bikeGroups = new Map<string, typeof filteredHistory>();
    for (const entry of filteredHistory) {
      const key = entry.bikeId;
      if (!bikeGroups.has(key)) bikeGroups.set(key, []);
      bikeGroups.get(key)!.push(entry);
    }
    return Array.from(bikeGroups.entries()).map(([bikeId, entries]) => ({
      bikeId,
      bikeName: bikeNameMap.get(bikeId) ?? 'Unknown Motorcycle',
      entries: entries.sort((a, b) => b.completedAt - a.completedAt),
    }));
  }, [filteredHistory, bikeNameMap]);

  const handleSaveToGallery = async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save images.');
        return;
      }
      const uri = await (viewShotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Service history saved to your photo gallery.');
    } catch (error) {
      if (__DEV__) console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save image.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Service History' });
    } catch (error) {
      if (__DEV__) console.error('Failed to share:', error);
    } finally {
      setSaving(false);
    }
  };

  const ownerName = user?.name || 'Owner';
  const dateGenerated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const isSubscribed = user?.subscriptionStatus === 'active';

  const FAKE_ENTRIES = [
    { name: 'Oil & Filter Change', date: 'Feb 12, 2026' },
    { name: 'Brake Pads - Front', date: 'Jan 28, 2026' },
    { name: 'Coolant Flush & Replace', date: 'Jan 15, 2026' },
    { name: 'Air Filter Replacement', date: 'Dec 20, 2025' },
    { name: 'Spark Plugs Replaced', date: 'Dec 3, 2025' },
    { name: 'Drive Chain Adjustment', date: 'Nov 18, 2025' },
    { name: 'Fork Oil Change', date: 'Nov 2, 2025' },
    { name: 'Brake Fluid Flush', date: 'Oct 15, 2025' },
    { name: 'Valve Clearance Check', date: 'Sep 28, 2025' },
    { name: 'Rear Brake Pads', date: 'Sep 10, 2025' },
    { name: 'Throttle Cable Lubrication', date: 'Aug 22, 2025' },
    { name: 'Battery Replacement', date: 'Aug 5, 2025' },
  ];
  const fakeBikeName = bikes.length > 0
    ? `${bikes[0].year} ${(bikes[0] as any).make} ${(bikes[0] as any).model}`
    : '2024 Sport Motorcycle';
  const showFakeData = !isSubscribed && groupedByBike.length === 0;

  const pages = useMemo(
    () => paginateEntries(groupedByBike, showFakeData, FAKE_ENTRIES, fakeBikeName),
    [groupedByBike, showFakeData, fakeBikeName],
  );

  const renderPageItem = (item: { type: string; data: any }, idx: number) => {
    if (item.type === 'bikeHeader') {
      return (
        <View key={`bh-${idx}`} style={s.docBikeHeader}>
          <Text style={s.docBikeName}>{item.data.bikeName}</Text>
        </View>
      );
    }
    if (item.type === 'tableHeader') {
      return (
        <View key={`th-${idx}`} style={s.docTableHeader}>
          <Text style={[s.docTableHeaderText, { flex: 2 }]}>Service</Text>
          <Text style={[s.docTableHeaderText, { flex: 1, textAlign: 'right' }]}>Date</Text>
        </View>
      );
    }
    if (item.type === 'row') {
      const d = item.data;
      const name = d.taskName ? cleanTaskName(d.taskName) : d.name;
      const date = d.completedAt
        ? new Date(d.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : d.date;
      return (
        <View key={`r-${idx}`} style={[s.docRow, d.index % 2 === 0 && s.docRowAlt]}>
          <Text style={[s.docRowText, { flex: 2 }]}>{name}</Text>
          <Text style={[s.docRowDate, { flex: 1, textAlign: 'right' }]}>{date}</Text>
        </View>
      );
    }
    if (item.type === 'summary') {
      return (
        <View key={`sm-${idx}`} style={s.docBikeSummary}>
          <Text style={s.docBikeSummaryText}>
            {item.data.count} service{item.data.count !== 1 ? 's' : ''} completed
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Service <Text style={{ color: colors.green }}>History</Text></Text>
        {isSubscribed ? (
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.7} disabled={saving}>
            <Share2 size={18} color={colors.green} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Document pages */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} scrollEnabled={isSubscribed}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={{ gap: 16 }}>
            {pages.map((pageItems, pageIdx) => (
              <View key={pageIdx} style={[s.document, { minHeight: docHeight }]}>
                {/* First page gets the document header */}
                {pageIdx === 0 && (
                  <View style={s.docHeader}>
                    <Text style={s.docTitle}>SERVICE HISTORY</Text>
                    <View style={s.docHeaderLine} />
                    <Text style={s.docOwner}>{ownerName}</Text>
                    <Text style={s.docDate}>Generated {dateGenerated}</Text>
                  </View>
                )}

                {/* Continuation header for page 2+ */}
                {pageIdx > 0 && (
                  <View style={s.docContinuationHeader}>
                    <Text style={s.docContinuationText}>SERVICE HISTORY — CONTINUED</Text>
                  </View>
                )}

                {/* Page content */}
                {pageItems.length === 0 && pageIdx === 0 && !showFakeData ? (
                  <View style={s.docEmpty}>
                    <Text style={s.docEmptyText}>No service records yet.</Text>
                  </View>
                ) : (
                  pageItems.map((item, idx) => renderPageItem(item, idx))
                )}

                {/* Spacer to fill A4 page */}
                <View style={{ flex: 1 }} />

                {/* Footer on every page */}
                <View style={s.docFooter}>
                  <Text style={s.docFooterText}>
                    Generated by Apex{pages.length > 1 ? ` — Page ${pageIdx + 1} of ${pages.length}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ViewShot>

        {/* Paywall overlay for free users — covers all pages */}
        {!isSubscribed && (
          <View style={s.paywallOverlayWrap}>
            <View style={s.paywallOverlay}>
              <BlurView intensity={20} tint="light" style={s.blurView} />
              <View style={s.paywallModal}>
                <BlurView intensity={40} tint="dark" style={s.paywallModalBlur}>
                  <View style={s.paywallIconWrap}>
                    <Brain size={28} color={colors.green} />
                  </View>
                  <Text style={s.paywallTitle}>
                    UNLEASH THE{'\n'}
                    <Text style={{ color: colors.green }}>FULL MACHINE</Text>
                  </Text>
                  <Text style={s.paywallSubtitle}>
                    Export and share your verified service passport with Apex Pro.
                  </Text>
                  <TouchableOpacity
                    style={s.paywallButton}
                    onPress={() => router.push('/membership')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.paywallButtonText}>UPGRADE TO PRO</Text>
                    <ChevronRight size={16} color="#000000" />
                  </TouchableOpacity>
                </BlurView>
              </View>
            </View>
          </View>
        )}

        {/* Save to Gallery — full width below doc, Pro only */}
        {isSubscribed && (
          <TouchableOpacity
            style={s.downloadBtn}
            onPress={handleSaveToGallery}
            activeOpacity={0.7}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={16} color={colors.green} />
            ) : (
              <Download size={16} color={colors.green} />
            )}
            <Text style={s.downloadBtnText}>Save to Gallery</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 120, gap: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: -0.5, color: colors.textPrimary } as any,

  // Document page (A4 aspect ratio)
  document: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 24,
  },

  // Doc header
  docHeader: { alignItems: 'center', marginBottom: 24 },
  docTitle: {
    fontSize: 22, fontWeight: '800', color: '#111111',
    letterSpacing: 3, textTransform: 'uppercase',
  },
  docHeaderLine: {
    width: 40, height: 2, backgroundColor: '#111111',
    marginVertical: 10,
  },
  docOwner: { fontSize: 14, fontWeight: '600', color: '#333333' },
  docDate: { fontSize: 11, color: '#888888', marginTop: 2 },

  // Continuation header
  docContinuationHeader: {
    alignItems: 'center', marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#DDDDDD', paddingBottom: 12,
  },
  docContinuationText: {
    fontSize: 10, fontWeight: '700', color: '#999999',
    letterSpacing: 2, textTransform: 'uppercase',
  },

  // Bike section
  docBikeSection: { marginBottom: 20 },
  docBikeHeader: {
    borderBottomWidth: 2, borderBottomColor: '#111111',
    paddingBottom: 6, marginBottom: 8, marginTop: 12,
  },
  docBikeName: { fontSize: 14, fontWeight: '700', color: '#111111', textTransform: 'uppercase', letterSpacing: 1 },

  // Table
  docTableHeader: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#DDDDDD',
  },
  docTableHeaderText: { fontSize: 10, fontWeight: '700', color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5 },

  docRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  docRowAlt: { backgroundColor: '#F8F8F8' },
  docRowText: { fontSize: 12, fontWeight: '500', color: '#222222' },
  docRowDate: { fontSize: 11, color: '#666666' },

  docBikeSummary: {
    borderTopWidth: 1, borderTopColor: '#EEEEEE',
    paddingTop: 6, marginTop: 4,
  },
  docBikeSummaryText: { fontSize: 10, color: '#999999', fontStyle: 'italic' },

  // Empty
  docEmpty: { paddingVertical: 32, alignItems: 'center' },
  docEmptyText: { fontSize: 13, color: '#999999' },

  // Footer
  docFooter: {
    borderTopWidth: 1, borderTopColor: '#DDDDDD',
    paddingTop: 12, marginTop: 8, alignItems: 'center',
  },
  docFooterText: { fontSize: 9, color: '#BBBBBB', letterSpacing: 1 },

  // Paywall overlay
  paywallOverlayWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  paywallOverlay: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  paywallModal: {
    width: '88%',
    maxWidth: 340,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
  },
  paywallModalBlur: {
    backgroundColor: 'rgba(10,10,10,0.85)',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  } as any,
  paywallIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paywallTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 1,
    marginBottom: 8,
  },
  paywallSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  paywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 16,
    width: '100%',
  },
  paywallButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 2,
  },

  // Share button — matches back button style, in header row
  shareBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Save to Gallery — full width below doc
  actions: { gap: 12 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)',
  },
  downloadBtnText: { fontSize: 14, fontWeight: '900', color: colors.green, textTransform: 'uppercase', letterSpacing: 2 },
});
