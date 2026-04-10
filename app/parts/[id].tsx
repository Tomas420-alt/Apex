import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  ArrowLeft,
  Package,
  ExternalLink,
  CheckCircle2,
  Circle,
  Hash,
  Store,
  Wrench,
  Droplets,
} from 'lucide-react-native';
import { GenerateButton } from '../../components/GenerateButton';
import { getCurrencySymbol, getCurrencyIconName } from '../../utils/currency';
import { CurrencyIcon } from '../../components/CurrencyIcon';
import { PartsListSkeletonLoader } from '../../components/SkeletonLoader';
import { colors } from '@/constants/theme';

interface Part {
  _id: Id<'parts'>;
  name: string;
  partNumber?: string;
  estimatedPrice?: number;
  supplier?: string;
  url?: string;
  purchased: boolean;
  category?: string;
}

const SECTION_CONFIG = {
  required: {
    title: 'Required Parts',
    subtitle: 'Must purchase to complete this task',
    icon: Package,
    iconColor: colors.green,
    accentBg: 'rgba(0,229,153,0.08)',
    accentBorder: 'rgba(0,229,153,0.2)',
  },
  consumable: {
    title: 'Consumables',
    subtitle: 'Single-use items needed for the job',
    icon: Droplets,
    iconColor: colors.orange,
    accentBg: 'rgba(255,159,67,0.08)',
    accentBorder: 'rgba(255,159,67,0.2)',
  },
  tool: {
    title: 'Recommended Tools',
    subtitle: 'You may already own these',
    icon: Wrench,
    iconColor: colors.textSecondary,
    accentBg: 'rgba(142,142,160,0.08)',
    accentBorder: 'rgba(142,142,160,0.2)',
  },
};

function PartCard({
  part,
  togglingId,
  onToggle,
  onOpenUrl,
  currency,
}: {
  part: Part;
  togglingId: Id<'parts'> | null;
  onToggle: (id: Id<'parts'>) => void;
  onOpenUrl: (url: string) => void;
  currency: string;
}) {
  return (
    <View style={[styles.partCard, part.purchased && styles.partCardPurchased]}>
      <View style={styles.partTopRow}>
        <TouchableOpacity
          onPress={() => onToggle(part._id)}
          activeOpacity={0.7}
          disabled={togglingId === part._id}
          style={styles.checkButton}
        >
          {togglingId === part._id ? (
            <ActivityIndicator size="small" color={colors.green} />
          ) : part.purchased ? (
            <CheckCircle2 size={22} color={colors.green} />
          ) : (
            <Circle size={22} color={colors.textTertiary} />
          )}
        </TouchableOpacity>
        <View style={styles.partInfo}>
          <Text
            style={[styles.partName, part.purchased && styles.partNamePurchased]}
            numberOfLines={2}
          >
            {part.name}
          </Text>
          {part.partNumber ? (
            <View style={styles.metaRow}>
              <Hash size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{part.partNumber}</Text>
            </View>
          ) : null}
        </View>
        {part.estimatedPrice ? (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              {currency}{part.estimatedPrice.toFixed(0)}
            </Text>
          </View>
        ) : null}
      </View>

      {part.supplier || part.url ? (
        <View style={styles.partBottomRow}>
          {part.supplier ? (
            <View style={styles.supplierChip}>
              <Store size={11} color={colors.textSecondary} />
              <Text style={styles.supplierText}>{part.supplier}</Text>
            </View>
          ) : null}
          {part.url ? (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => onOpenUrl(part.url!)}
              activeOpacity={0.7}
            >
              <ExternalLink size={12} color={colors.blue} />
              <Text style={styles.linkText}>Buy</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function TaskPartsScreen() {
  const { id, taskName, bikeId } = useLocalSearchParams<{
    id: string;
    taskName: string;
    bikeId: string;
  }>();
  const taskId = id as Id<'maintenanceTasks'>;
  const bikeIdTyped = bikeId as Id<'bikes'>;

  const parts = useQuery(api.parts.listByTask, { taskId }) as Part[] | undefined;
  const currentUser = useQuery(api.users.getCurrent);
  const generateParts = useMutation(api.parts.generateForTask);
  const togglePurchased = useMutation(api.parts.togglePurchased);
  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);

  const [isGenerating, setIsGenerating] = useState(false);
  const [togglingId, setTogglingId] = useState<Id<'parts'> | null>(null);
  const partsSnapshotRef = useRef<string>('');

  const decodedTaskName = taskName ? decodeURIComponent(taskName) : 'Maintenance Task';
  const hasParts = parts && parts.length > 0;
  const isLoading = parts === undefined;

  // Stop generating when parts data actually changes from the snapshot
  useEffect(() => {
    if (!isGenerating || !parts) return;
    const currentIds = parts.map((p) => p._id).join(',');
    if (parts.length > 0 && currentIds !== partsSnapshotRef.current) {
      setIsGenerating(false);
    }
  }, [parts, isGenerating]);

  // Safety timeout — stop after 60s if something fails silently
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => setIsGenerating(false), 60000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  // Group parts by category
  const requiredParts = hasParts ? parts.filter((p) => !p.category || p.category === 'required') : [];
  const consumableParts = hasParts ? parts.filter((p) => p.category === 'consumable') : [];
  const toolParts = hasParts ? parts.filter((p) => p.category === 'tool') : [];

  const handleGenerate = async () => {
    // Snapshot current part IDs so we can detect when new data arrives
    partsSnapshotRef.current = (parts ?? []).map((p) => p._id).join(',');
    setIsGenerating(true);
    try {
      await generateParts({ taskId, bikeId: bikeIdTyped });
    } catch (error) {
      if (__DEV__) console.error('Failed to generate parts:', error);
      Alert.alert('Error', 'Failed to generate parts list. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleToggle = async (partId: Id<'parts'>) => {
    setTogglingId(partId);
    try {
      await togglePurchased({ partId });
    } catch (error) {
      if (__DEV__) console.error('Failed to toggle part:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link.');
    });
  };

  const totalCost = hasParts
    ? parts.filter((p) => p.category !== 'tool').reduce((sum, p) => sum + (p.estimatedPrice ?? 0), 0)
    : 0;
  const purchasedCount = hasParts
    ? parts.filter((p) => p.purchased).length
    : 0;

  const renderSection = (
    categoryKey: 'required' | 'consumable' | 'tool',
    sectionParts: Part[]
  ) => {
    if (sectionParts.length === 0) return null;
    const config = SECTION_CONFIG[categoryKey];
    const Icon = config.icon;

    return (
      <View key={categoryKey}>
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: config.accentBg, borderColor: config.accentBorder },
          ]}
        >
          <Icon size={16} color={config.iconColor} />
          <View style={styles.sectionTextBlock}>
            <Text style={[styles.sectionTitle, { color: config.iconColor }]}>{config.title}</Text>
            <Text style={styles.sectionSubtitle}>{config.subtitle}</Text>
          </View>
        </View>
        {sectionParts.map((part) => (
          <PartCard
            key={part._id}
            part={part}
            togglingId={togglingId}
            onToggle={handleToggle}
            onOpenUrl={handleOpenUrl}
            currency={currency}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Parts List
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Task name */}
        <View style={styles.taskNameCard}>
          <Package size={18} color={colors.blue} />
          <Text style={styles.taskNameText} numberOfLines={2}>
            {decodedTaskName}
          </Text>
        </View>

        {isLoading || (isGenerating && hasParts) ? (
          <PartsListSkeletonLoader />
        ) : !hasParts ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Package size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Parts Listed</Text>
            <Text style={styles.emptySubtitle}>
              Generate an AI-powered parts list with estimated prices and
              supplier recommendations.
            </Text>
            <GenerateButton
              label="Generate Parts List"
              loadingLabel="Generating"
              onPress={handleGenerate}
              isLoading={isGenerating}
              variant="primary"
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={15} color={colors.green} />
                <Text style={styles.summaryLabel}>Est. Total</Text>
                <Text style={styles.summaryValue}>{currency}{totalCost.toFixed(0)}</Text>
              </View>
              <View style={[styles.summaryItem, styles.summaryItemBordered]}>
                <CheckCircle2 size={15} color={colors.blue} />
                <Text style={styles.summaryLabel}>Purchased</Text>
                <Text style={styles.summaryValue}>
                  {purchasedCount}/{parts.length}
                </Text>
              </View>
            </View>

            <Text style={styles.priceDisclaimer}>Prices are estimated and may differ from the retailer.</Text>

            {/* Required parts */}
            {renderSection('required', requiredParts)}

            {/* Divider between required and optional */}
            {(consumableParts.length > 0 || toolParts.length > 0) ? (
              <View style={styles.optionalDivider}>
                <View style={styles.optionalDividerLine} />
                <Text style={styles.optionalDividerText}>Recommended / Optional</Text>
                <View style={styles.optionalDividerLine} />
              </View>
            ) : null}

            {/* Optional sections */}
            {renderSection('consumable', consumableParts)}
            {renderSection('tool', toolParts)}

            {/* Regenerate */}
            <GenerateButton
              label="Regenerate Parts List"
              loadingLabel="Regenerating"
              onPress={handleGenerate}
              isLoading={isGenerating}
              variant="secondary"
              style={{ marginTop: 4 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 12,
  },
  taskNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(91,141,239,0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(91,141,239,0.2)',
  },
  taskNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.blue,
    lineHeight: 20,
  },
  centeredContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  centeredText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryItemBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    marginLeft: 12,
    paddingLeft: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceDisclaimer: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  sectionTextBlock: {
    flex: 1,
    gap: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Part card
  partCard: {
    backgroundColor: colors.surface1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  partCardPurchased: {
    opacity: 0.7,
    borderColor: 'rgba(0,229,153,0.2)',
    backgroundColor: 'rgba(0,229,153,0.05)',
  },
  partTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkButton: {
    paddingTop: 1,
  },
  partInfo: {
    flex: 1,
    gap: 4,
  },
  partName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  partNamePurchased: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: 'rgba(0,229,153,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  partBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 32,
  },
  supplierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91,141,239,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(91,141,239,0.2)',
  },
  linkText: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: '600',
  },
  // Optional divider
  optionalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 0,
    paddingHorizontal: 4,
  },
  optionalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  optionalDividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
    letterSpacing: 0.3,
  },
});
