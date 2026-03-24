import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import {
  ArrowLeft,
  Package,
  ExternalLink,
  CheckCircle2,
  Circle,
  Hash,
  Store,
} from 'lucide-react-native';
import { getCurrencySymbol, getCurrencyIconName } from '../../../utils/currency';
import { CurrencyIcon } from '../../../components/CurrencyIcon';
import { colors } from '@/constants/theme';

interface Part {
  _id: Id<'parts'>;
  name: string;
  partNumber?: string;
  estimatedPrice?: number;
  supplier?: string;
  url?: string;
  purchased: boolean;
}

export default function BikePartsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bikeId = id as Id<'bikes'>;

  const bike = useQuery(api.bikes.get, { id: bikeId });
  const parts = useQuery(api.parts.listByBike, { bikeId }) as Part[] | undefined;
  const currentUser = useQuery(api.users.getCurrent);
  const togglePurchased = useMutation(api.parts.togglePurchased);
  const currency = getCurrencySymbol(currentUser?.country);
  const currencyIconName = getCurrencyIconName(currentUser?.country);

  const [togglingId, setTogglingId] = useState<Id<'parts'> | null>(null);

  const isLoading = bike === undefined || parts === undefined;
  const hasParts = parts && parts.length > 0;

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.centeredText}>Loading parts...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          All Parts
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bike name */}
        {bike ? (
          <View style={styles.bikeNameCard}>
            <Package size={18} color={colors.blue} />
            <Text style={styles.bikeNameText}>
              {bike.year} {bike.make} {bike.model}
            </Text>
          </View>
        ) : null}

        {!hasParts ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Package size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Parts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Parts will appear here once you generate them from individual
              maintenance tasks.
            </Text>
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

            {/* Parts list */}
            {parts.map((part) => (
              <View
                key={part._id}
                style={[styles.partCard, part.purchased && styles.partCardPurchased]}
              >
                <View style={styles.partTopRow}>
                  <TouchableOpacity
                    onPress={() => handleToggle(part._id)}
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
                      style={[
                        styles.partName,
                        part.purchased && styles.partNamePurchased,
                      ]}
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

                {(part.supplier || part.url) ? (
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
                        onPress={() => handleOpenUrl(part.url!)}
                        activeOpacity={0.7}
                      >
                        <ExternalLink size={12} color={colors.blue} />
                        <Text style={styles.linkText}>Buy</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
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
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centeredText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bikeNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(91,141,239,0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(91,141,239,0.2)',
  },
  bikeNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.blue,
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
});
