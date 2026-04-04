import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import {
  UserRoundCheck,
  User,
  Plus,
  ChevronRight,
  Settings,
  Crown,
  Camera,
  ClipboardList,
  CreditCard,
  BrainCircuit,
  Box,
} from 'lucide-react-native';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { colors } from '@/constants/theme';

interface BikeDoc {
  _id: Id<'bikes'>;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  experienceLevel?: string;
}

/** Subtle digital grid overlay matching the HTML design */
function DigitalGrid({ width, height }: { width: number; height: number }) {
  const spacing = 40;
  const lineColor = 'rgba(0,242,255,0.03)';
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line
            key={`v${i}`}
            x1={i * spacing}
            y1={0}
            x2={i * spacing}
            y2={height}
            stroke={lineColor}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * spacing}
            x2={width}
            y2={i * spacing}
            stroke={lineColor}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function PilotScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const user = useQuery(api.users.getCurrent);
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);
  const updateBikeImageFromStorage = useMutation(api.bikes.updateBikeImageFromStorage);
  const regenerateHeroImage = useMutation(api.bikes.regenerateHeroImage);
  const updateProfileImage = useMutation(api.users.updateProfileImageFromStorage);

  const [uploadingBikeId, setUploadingBikeId] = useState<Id<'bikes'> | null>(null);
  const [uploadingPfp, setUploadingPfp] = useState(false);

  const handleChangePhoto = async (bikeId: Id<'bikes'>) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingBikeId(bikeId);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResult.json();
      await updateBikeImageFromStorage({ bikeId, storageId });
      // Trigger hero image regeneration via the real AI flow
      await regenerateHeroImage({ bikeId }).catch((e: any) => {
        if (__DEV__) console.error('Hero regen failed:', e);
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to upload image:', error);
      Alert.alert('Error', 'Failed to update bike photo.');
    } finally {
      setUploadingBikeId(null);
    }
  };

  const handleChangeProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPfp(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResult.json();
      await updateProfileImage({ storageId });
    } catch (error) {
      if (__DEV__) console.error('Failed to upload profile photo:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
    } finally {
      setUploadingPfp(false);
    }
  };

  const profileImageUrl = user?.image || null;

  const handleManageSubscription = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      if (info.managementURL) {
        Linking.openURL(info.managementURL);
      } else {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      }
    } catch {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  };

  // Derive rider level from first bike's experience
  const experienceLevel = bikes[0]?.experienceLevel ?? 'Rider';
  const levelLabel =
    experienceLevel === 'beginner' ? 'Novice Rider' :
    experienceLevel === 'intermediate' ? 'Intermediate Rider' :
    experienceLevel === 'advanced' ? 'Advanced Rider' :
    experienceLevel === 'expert' ? 'Expert Rider' : 'Rider';

  const isPro = user?.subscriptionStatus === 'active';
  const memberSince = user?._creationTime
    ? new Date(user._creationTime).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()
    : '';

  if (!isAuthenticated || user === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Background ambient effects — matches HTML spec exactly */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Glow orbs using SVG radial gradients for actual blur effect */}
        <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Top-right glow: HTML = 300x300, opacity 0.10, blur 100px */}
            <RadialGradient id="glowTopRight" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.10" />
              <Stop offset="30%" stopColor="#00f2ff" stopOpacity="0.05" />
              <Stop offset="70%" stopColor="#00f2ff" stopOpacity="0.015" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
            {/* Bottom-left glow: HTML = 250x250, opacity 0.05, blur 80px */}
            <RadialGradient id="glowBottomLeft" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00f2ff" stopOpacity="0.06" />
              <Stop offset="30%" stopColor="#00f2ff" stopOpacity="0.025" />
              <Stop offset="70%" stopColor="#00f2ff" stopOpacity="0.008" />
              <Stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Top-right: wider spread for softer blur */}
          <Rect
            x={screenWidth - 400}
            y={-300}
            width={700}
            height={700}
            fill="url(#glowTopRight)"
          />
          {/* Bottom-left: wider spread for softer blur */}
          <Rect
            x={-300}
            y={screenHeight - 550}
            width={600}
            height={600}
            fill="url(#glowBottomLeft)"
          />
        </Svg>
        {/* Digital grid: 40px spacing, rgba(0,242,255,0.03) lines at 0.4 opacity */}
        <DigitalGrid width={screenWidth} height={screenHeight} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <UserRoundCheck size={20} color={colors.green} />
              <Text style={styles.headerTitle}>
                Pilot <Text style={{ color: colors.green }}>Protocol</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings' as any)} activeOpacity={0.7}>
              <Settings size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <BlurView intensity={15} tint="dark" style={styles.profileCardInner}>
              <TouchableOpacity
                style={styles.avatarOuter}
                onPress={handleChangeProfilePhoto}
                activeOpacity={0.7}
                disabled={uploadingPfp}
              >
                <View style={styles.avatarInner}>
                  {uploadingPfp ? (
                    <ActivityIndicator size="small" color={colors.green} />
                  ) : profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
                  ) : (
                    <User size={36} color={colors.textTertiary} strokeWidth={1.5} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name || 'Pilot'}</Text>
                <Text style={styles.levelLabel}>{levelLabel}</Text>
                <Text style={styles.memberId}>
                  {memberSince ? `Since ${memberSince}` : ''}
                  {'  //  '}
                  <Text style={{ color: isPro ? colors.green : colors.green, fontWeight: '900' }}>
                    {isPro ? 'Pro' : 'Free'}
                  </Text>
                </Text>
              </View>
            </BlurView>
          </View>

          {/* Subscription Banner */}
          {isPro ? (
            <TouchableOpacity
              style={styles.manageSubButton}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <CreditCard size={18} color={colors.textPrimary} />
              <Text style={styles.manageSubText}>Manage Subscription</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => router.push('/membership' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.green, '#00a2ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBannerGradient}
              >
                <View style={styles.upgradeBannerIconWrap}>
                  <BrainCircuit size={22} color="#000000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeBannerTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeBannerSubtitle}>Unlock AI plans, inspections & parts lists</Text>
                </View>
                <ChevronRight size={16} color="#000000" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Hangar / Active Units */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Box size={14} color={colors.green} />
              <Text style={styles.sectionTitle}>Hangar / Active Units</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/add-bike' as any)} activeOpacity={0.7}>
              <Text style={styles.registerUnit}>+ Register Unit</Text>
            </TouchableOpacity>
          </View>

          {bikes.length === 0 ? (
            <View style={styles.emptyHangar}>
              <Box size={32} color={colors.textTertiary} />
              <Text style={styles.emptyHangarText}>No units registered</Text>
              <TouchableOpacity
                style={styles.addBikeButton}
                onPress={() => router.push('/add-bike' as any)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBikeButtonText}>Register Unit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bikes.map((bike, index) => (
              <View key={bike._id} style={[styles.bikeCard, index === 0 && styles.bikeCardPrimary]}>
                <BlurView intensity={15} tint="dark" style={styles.bikeCardBlur}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/bike/${bike._id}` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.bikeCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bikeName}>{bike.make} {bike.model}</Text>
                        <Text style={styles.bikeSubtitle}>
                          {index === 0 ? 'Primary Unit' : 'Unit'} // {bike.year} Model
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changePhotoBtn}
                        onPress={() => handleChangePhoto(bike._id)}
                        activeOpacity={0.7}
                        disabled={uploadingBikeId === bike._id}
                      >
                        {uploadingBikeId === bike._id ? (
                          <ActivityIndicator size={12} color={colors.textPrimary} />
                        ) : (
                          <Camera size={12} color={colors.textPrimary} />
                        )}
                        <Text style={styles.changePhotoText}>
                          {uploadingBikeId === bike._id ? 'Uploading...' : 'Photo'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.bikeStatsRow}>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatLabel}>Mileage</Text>
                        <Text style={styles.bikeStatValue}>
                          {bike.mileage?.toLocaleString() ?? '\u2014'} KM
                        </Text>
                      </View>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatLabel}>Status</Text>
                        <View style={styles.statusRow}>
                          <View style={styles.statusDot} />
                          <Text style={styles.statusText}>Deployed</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </BlurView>
              </View>
            ))
          )}

          {/* Service History */}
          <TouchableOpacity
            style={styles.serviceHistoryButton}
            onPress={() => router.push('/service-history' as any)}
            activeOpacity={0.7}
          >
            <ClipboardList size={20} color={colors.green} />
            <Text style={styles.serviceHistoryButtonText}>Service History</Text>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Version */}
          <Text style={styles.version}>Apex v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120, gap: 24 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(18,18,18,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Profile card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  profileCardInner: {
    backgroundColor: 'transparent',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  } as any,
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.green,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textTertiary,
    marginTop: 4,
  },
  memberId: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },

  // Upgrade banner
  upgradeBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 16,
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  upgradeBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: '#000000',
  },
  upgradeBannerSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  manageSubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.15)',
  },
  manageSubText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  registerUnit: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // Empty hangar
  emptyHangar: {
    backgroundColor: 'rgba(26,26,26,0.9)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyHangarText: { fontSize: 14, color: colors.textSecondary },
  addBikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBikeButtonText: { fontSize: 14, fontWeight: '600', color: '#000000' },

  // Bike card
  bikeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  bikeCardBlur: {
    backgroundColor: 'transparent',
    padding: 24,
  },
  bikeCardPrimary: {
    borderColor: 'rgba(0,242,255,0.2)',
  },
  bikeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  bikeName: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bikeSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textTertiary,
    marginTop: 4,
  },
  bikeStatsRow: { flexDirection: 'row', gap: 40 },
  bikeStat: { gap: 4 },
  bikeStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bikeStatValue: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.green,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  changePhotoText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textPrimary,
  },

  // Service history — pro feature, subtle accent (less prominent than upgrade CTA)
  serviceHistoryButton: {
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.15)',
  },
  serviceHistoryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 2,
    flex: 1,
  },

  version: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
