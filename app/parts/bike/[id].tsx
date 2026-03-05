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
      console.error('Failed to toggle part:', error);
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
    ? parts.reduce((sum, p) => sum + (p.estimatedPrice ?? 0), 0)
    : 0;
  const purchasedCount = hasParts
    ? parts.filter((p) => p.purchased).length
    : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.centeredText}>Loading parts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1F2937" />
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
            <Package size={18} color="#3B82F6" />
            <Text style={styles.bikeNameText}>
              {bike.year} {bike.make} {bike.model}
            </Text>
          </View>
        ) : null}

        {!hasParts ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Package size={40} color="#9CA3AF" />
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
                <CurrencyIcon iconName={currencyIconName} fallbackSymbol={currency} size={15} color="#10B981" />
                <Text style={styles.summaryLabel}>Est. Total</Text>
                <Text style={styles.summaryValue}>{currency}{totalCost.toFixed(0)}</Text>
              </View>
              <View style={[styles.summaryItem, styles.summaryItemBordered]}>
                <CheckCircle2 size={15} color="#3B82F6" />
                <Text style={styles.summaryLabel}>Purchased</Text>
                <Text style={styles.summaryValue}>
                  {purchasedCount}/{parts.length}
                </Text>
              </View>
            </View>

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
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : part.purchased ? (
                      <CheckCircle2 size={22} color="#10B981" />
                    ) : (
                      <Circle size={22} color="#D1D5DB" />
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
                        <Hash size={11} color="#9CA3AF" />
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
                        <Store size={11} color="#6B7280" />
                        <Text style={styles.supplierText}>{part.supplier}</Text>
                      </View>
                    ) : null}
                    {part.url ? (
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleOpenUrl(part.url!)}
                        activeOpacity={0.7}
                      >
                        <ExternalLink size={12} color="#3B82F6" />
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  bikeNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bikeNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryItemBordered: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    marginLeft: 12,
    paddingLeft: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  partCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  partCardPurchased: {
    opacity: 0.7,
    borderColor: '#D1FAE5',
    backgroundColor: '#F9FFFE',
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
    color: '#1F2937',
    lineHeight: 20,
  },
  partNamePurchased: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supplierText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  linkText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
