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
  Crown,
  Sparkles,
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
  return EXCLUDED_TASKS.some((exc) => lower.includes(exc));
}

// Clean up task names — make them definitive instead of conditional
function cleanTaskName(name: string): string {
  let cleaned = name;
  // Remove parenthetical conditions
  cleaned = cleaned.replace(/\s*\(replace if (?:necessary|needed|required)\)/gi, ' - Replaced');
  cleaned = cleaned.replace(/\s*\((?:replace|change) (?:if |as )?\w+\)/gi, ' - Replaced');
  // Convert inspection/cleaning to definitive action
  cleaned = cleaned.replace(/inspection\/cleaning/gi, 'Replaced');
  cleaned = cleaned.replace(/inspection \/ cleaning/gi, 'Replaced');
  cleaned = cleaned.replace(/inspect(?:ion)? (?:and|&) clean(?:ing)?/gi, 'Cleaned & Inspected');
  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1FFFF}]/gu, '');
  return cleaned.trim();
}

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrent);
  const bikes = useQuery(api.bikes.list) ?? [];
  const history = useQuery(api.maintenanceTasks.listAllCompletionHistory) ?? [];
  const viewShotRef = useRef<ViewShot>(null);
  const [saving, setSaving] = React.useState(false);

  // Build bike name map
  const bikeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bike of bikes) {
      map.set(bike._id, `${bike.year} ${(bike as any).make} ${(bike as any).model}`);
    }
    return map;
  }, [bikes]);

  // Filter and clean history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => !shouldExcludeTask(h.taskName));
  }, [history]);

  // Group by bike, then by date
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
      console.error('Failed to save:', error);
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
      console.error('Failed to share:', error);
    } finally {
      setSaving(false);
    }
  };

  const ownerName = user?.name || 'Owner';
  const dateGenerated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const isSubscribed = user?.subscriptionStatus === 'active';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Service History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Document preview */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ position: 'relative' }}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={s.document}>
              {/* Document header */}
              <View style={s.docHeader}>
                <Text style={s.docTitle}>SERVICE HISTORY</Text>
                <View style={s.docHeaderLine} />
                <Text style={s.docOwner}>{ownerName}</Text>
                <Text style={s.docDate}>Generated {dateGenerated}</Text>
              </View>

              {/* Per-bike sections */}
              {groupedByBike.length === 0 ? (
                <View style={s.docEmpty}>
                  <Text style={s.docEmptyText}>No service records yet.</Text>
                </View>
              ) : (
                groupedByBike.map((group) => (
                  <View key={group.bikeId} style={s.docBikeSection}>
                    <View style={s.docBikeHeader}>
                      <Text style={s.docBikeName}>{group.bikeName}</Text>
                    </View>

                    {/* Table header */}
                    <View style={s.docTableHeader}>
                      <Text style={[s.docTableHeaderText, { flex: 2 }]}>Service</Text>
                      <Text style={[s.docTableHeaderText, { flex: 1, textAlign: 'right' }]}>Date</Text>
                    </View>

                    {/* Entries */}
                    {group.entries.map((entry, i) => (
                      <View key={entry._id} style={[s.docRow, i % 2 === 0 && s.docRowAlt]}>
                        <Text style={[s.docRowText, { flex: 2 }]}>
                          {cleanTaskName(entry.taskName)}
                        </Text>
                        <Text style={[s.docRowDate, { flex: 1, textAlign: 'right' }]}>
                          {new Date(entry.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    ))}

                    <View style={s.docBikeSummary}>
                      <Text style={s.docBikeSummaryText}>
                        {group.entries.length} service{group.entries.length !== 1 ? 's' : ''} completed
                      </Text>
                    </View>
                  </View>
                ))
              )}

              {/* Footer */}
              <View style={s.docFooter}>
                <Text style={s.docFooterText}>Generated by Apex</Text>
              </View>
            </View>
          </ViewShot>

          {/* Paywall overlay for free users */}
          {!isSubscribed && (
            <View style={s.paywallOverlay}>
              <BlurView intensity={20} tint="light" style={s.blurView} />
              <View style={s.paywallContent}>
                <View style={s.paywallBadge}>
                  <Crown size={26} color="#B47800" />
                </View>
                <Text style={s.paywallTitle}>Pro Feature</Text>
                <Text style={s.paywallSubtitle}>
                  Export and share your complete service history with Apex Pro.
                </Text>
                <TouchableOpacity
                  style={s.paywallButton}
                  onPress={() => router.push('/membership')}
                  activeOpacity={0.85}
                >
                  <Sparkles size={16} color="#000000" />
                  <Text style={s.paywallButtonText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action buttons — only for Pro users */}
        {isSubscribed && (
          <View style={s.actions}>
            <TouchableOpacity
              style={s.downloadBtn}
              onPress={handleSaveToGallery}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size={16} color="#FFFFFF" />
              ) : (
                <Download size={16} color="#FFFFFF" />
              )}
              <Text style={s.downloadBtnText}>Save to Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.shareBtn}
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Share2 size={16} color={colors.green} />
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(26,26,46,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  // Document (printable preview)
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

  // Bike section
  docBikeSection: { marginBottom: 20 },
  docBikeHeader: {
    borderBottomWidth: 2, borderBottomColor: '#111111',
    paddingBottom: 6, marginBottom: 8,
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
  paywallOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  paywallContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  paywallBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(180,120,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  paywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 40,
    boxShadow: '0 4px 12px rgba(0,229,153,0.3)',
  },
  paywallButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },

  // Action buttons
  actions: { flexDirection: 'row', gap: 12 },
  downloadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: 14, paddingVertical: 16,
  },
  downloadBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(0,229,153,0.1)', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 24, borderWidth: 1, borderColor: 'rgba(0,229,153,0.2)',
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: colors.green },
});
