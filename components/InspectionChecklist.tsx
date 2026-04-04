import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { router } from 'expo-router';
import { GenerateButton } from './GenerateButton';
import { colors } from '@/constants/theme';

interface InspectionItem {
  _id: Id<'inspectionItems'>;
  name: string;
  description: string;
  category: string;
  responseType: string;
  options?: string[];
  unit?: string;
  response?: string;
  order: number;
}

interface Props {
  bikeId: Id<'bikes'>;
  inspectionStatus: string | undefined;
  isSubscribed?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  tires: colors.orange,
  brakes: colors.red,
  fluids: colors.blue,
  chain: colors.green,
  electrical: colors.purple,
  general: colors.textSecondary,
};

export function InspectionChecklist({ bikeId, inspectionStatus, isSubscribed }: Props) {
  const items = useQuery(api.inspectionMutations.listByBike, { bikeId }) as InspectionItem[] | undefined;
  const saveResponse = useMutation(api.inspectionMutations.saveResponse);
  const completeInspection = useMutation(api.inspectionMutations.completeInspection);
  const startInspection = useMutation(api.inspectionMutations.startInspection);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Not started yet or error — show the start button
  if (!inspectionStatus || inspectionStatus === 'error') {
    const handleStart = async () => {
      if (!isSubscribed) {
        router.push('/membership' as any);
        return;
      }
      setIsStarting(true);
      try {
        await startInspection({ bikeId });
      } catch (e) {
        if (__DEV__) console.error(e);
        setIsStarting(false);
      }
    };

    return (
      <View style={styles.inspectCard}>
        <BlurView intensity={15} tint="dark" style={styles.inspectCardInner}>
          {/* Top neon gradient edge — HTML: h-1 opacity-30 via-cyan */}
          <LinearGradient
            colors={['transparent', '#00f2ff', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, opacity: 0.3 }}
          />

          {/* Icon: w-20 h-20 rounded-3xl pure black bg, no glow */}
          <View style={styles.inspectIconWrap}>
            <ClipboardCheck size={36} color={colors.green} strokeWidth={1.8} />
          </View>

          {/* Title: bold italic uppercase */}
          <Text style={styles.inspectTitle}>
            {inspectionStatus === 'error' ? 'INSPECTION FAILED' : 'INITIAL INSPECTION NEEDED'}
          </Text>

          {/* Body text */}
          <Text style={styles.inspectDesc}>
            {inspectionStatus === 'error'
              ? 'Something went wrong generating the checklist. Tap below to try again.'
              : "Since there\u2019s no service history recorded for this unit, our AI requires a preliminary baseline. Complete the 12-point scan to generate your surgical maintenance plan."}
          </Text>

          {/* CTA button — HTML: w-full rounded-xl py-4 tracking-widest text-sm neon-btn-glow */}
          <TouchableOpacity
            style={[styles.inspectCta, { opacity: isStarting ? 0.6 : 1 }]}
            onPress={handleStart}
            activeOpacity={0.85}
            disabled={isStarting}
          >
            {isStarting && <ActivityIndicator size={18} color="#000" style={{ marginRight: 8 }} />}
            <Text style={styles.inspectCtaText}>
              {isStarting ? 'INITIALIZING...' : inspectionStatus === 'error' ? 'RETRY INSPECTION' : 'INITIALIZE INSPECTION'}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  // Loading items
  if (!items) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Generating inspection checklist...</Text>
      </View>
    );
  }

  // Still generating (no items yet but status is pending/ready)
  if (items.length === 0 && inspectionStatus === 'pending') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Generating inspection checklist...</Text>
      </View>
    );
  }

  // Items empty but status is ready — shouldn't happen, show retry
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <ClipboardCheck size={40} color={colors.orange} />
        </View>
        <Text style={styles.emptyTitle}>No Checklist Items</Text>
        <Text style={styles.emptySubtitle}>
          Something went wrong. Tap below to regenerate the checklist.
        </Text>
        <GenerateButton
          label="Retry Inspection"
          loadingLabel="Generating Checklist"
          onPress={async () => {
            if (!isSubscribed) {
              router.push('/membership' as any);
              return;
            }
            setIsStarting(true);
            try {
              await startInspection({ bikeId });
            } catch (e) {
              if (__DEV__) console.error(e);
              setIsStarting(false);
            }
          }}
          isLoading={isStarting}
          variant="primary"
          style={{ marginTop: 8 }}
        />
      </View>
    );
  }

  const answeredCount = items.filter(
    (i) => i.response || localValues[i._id]
  ).length;
  const allAnswered = answeredCount === items.length;

  const handleSave = async (itemId: Id<'inspectionItems'>, value: string) => {
    setLocalValues((prev) => ({ ...prev, [itemId]: value }));
    await saveResponse({ itemId, response: value });
  };

  const handleComplete = async () => {
    if (!isSubscribed) {
      router.push('/membership' as any);
      return;
    }
    setIsCompleting(true);
    try {
      // Flush any unsaved local values to DB before completing
      // (number/text inputs only save onBlur, so they may be unsaved)
      for (const item of items ?? []) {
        const localVal = localValues[item._id];
        if (localVal && localVal !== item.response) {
          await saveResponse({ itemId: item._id, response: localVal });
        }
      }
      await completeInspection({ bikeId });
    } catch (e) {
      if (__DEV__) console.error(e);
      setIsCompleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ClipboardCheck size={20} color={colors.orange} />
          <Text style={styles.headerTitle}>Initial Inspection</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {answeredCount}/{items.length}
          </Text>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>
        Check each item on your bike and record what you find. This helps us
        create an accurate maintenance plan.
      </Text>

      {/* Items */}
      {items.map((item) => {
        const isExpanded = expandedId === item._id;
        const currentValue = localValues[item._id] ?? item.response;
        const isAnswered = !!currentValue;
        const catColor = CATEGORY_COLORS[item.category] ?? colors.textSecondary;

        return (
          <View key={item._id} style={styles.itemCard}>
            <TouchableOpacity
              style={styles.itemHeader}
              onPress={() => setExpandedId(isExpanded ? null : item._id)}
              activeOpacity={0.7}
            >
              <View style={styles.itemHeaderLeft}>
                {isAnswered ? (
                  <CheckCircle2 size={20} color={colors.green} />
                ) : (
                  <Circle size={20} color={colors.textTertiary} />
                )}
                <View style={styles.itemTitleBlock}>
                  <Text
                    style={[
                      styles.itemName,
                      isAnswered && styles.itemNameAnswered,
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                </View>
              </View>
              {isExpanded ? (
                <ChevronUp size={18} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.itemBody}>
                <Text style={styles.itemDescription}>{item.description}</Text>

                {item.responseType === 'choice' && item.options ? (
                  <View style={styles.choiceContainer}>
                    {item.options.map((opt) => {
                      const isSelected = currentValue === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            styles.choiceChip,
                            isSelected && styles.choiceChipSelected,
                          ]}
                          onPress={() => handleSave(item._id, opt)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              isSelected && styles.choiceTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : item.responseType === 'number' ? (
                  <View style={styles.numberRow}>
                    <TextInput
                      style={styles.numberInput}
                      placeholder="Enter value"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      value={currentValue ?? ''}
                      onChangeText={(text) => {
                        setLocalValues((prev) => ({ ...prev, [item._id]: text }));
                        if (text.trim()) handleSave(item._id, text);
                      }}
                    />
                    {item.unit ? (
                      <Text style={styles.unitText}>{item.unit}</Text>
                    ) : null}
                  </View>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Describe what you see..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    value={currentValue ?? ''}
                    onChangeText={(text) => {
                      setLocalValues((prev) => ({ ...prev, [item._id]: text }));
                      if (text.trim()) handleSave(item._id, text);
                    }}
                  />
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Complete button */}
      <GenerateButton
        label={allAnswered ? 'Generate Maintenance Plan' : `${items.length - answeredCount} items remaining`}
        loadingLabel="Generating Plan"
        onPress={handleComplete}
        isLoading={isCompleting}
        variant="primary"
        style={{ marginTop: 12, opacity: allAnswered ? 1 : 0.5 }}
        disabled={!allAnswered}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  progressBadge: {
    backgroundColor: 'rgba(255,159,67,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // ── Inspection prompt (not started state) — matches HTML v3 ──
  inspectCard: {
    borderRadius: 40,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  } as any,
  inspectCardInner: {
    backgroundColor: 'transparent',
    padding: 40,
    alignItems: 'center',
  } as any,
  inspectIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  } as any,
  inspectIconGlow: {
    // Kept for potential reuse but currently unused
    display: 'none',
  } as any,
  inspectTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  } as any,
  inspectDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 40,
  },
  inspectCta: {
    width: '100%',
    backgroundColor: colors.green,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(0,242,255,0.4)',
  } as any,
  inspectCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as any,
  // Keep old names as aliases for the "no items" state
  emptyContainer: {
    borderRadius: 40,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: 'rgba(26,26,46,0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  itemNameAnswered: {
    color: colors.textSecondary,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    gap: 12,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  choiceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
