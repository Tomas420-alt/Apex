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
  Switch,
  Image,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Shield,
  Bell,
  LogOut,
  Plus,
  ChevronRight,
  Bike,
  Settings,
  MessageSquare,
  Crown,
  Camera,
  FileText,
  CreditCard,
} from 'lucide-react-native';
import { useAuthActions } from '@convex-dev/auth/react';
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

export default function PilotScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrent);
  const bikes = (useQuery(api.bikes.list) ?? []) as BikeDoc[];
  const updatePreferences = useMutation(api.users.updatePreferences);
  const generateUploadUrl = useMutation(api.imageEdits.generateUploadUrl);
  const updateBikeImageFromStorage = useMutation(api.bikes.updateBikeImageFromStorage);
  const updateProfileImage = useMutation(api.users.updateProfileImageFromStorage);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [uploadingBikeId, setUploadingBikeId] = useState<Id<'bikes'> | null>(null);
  const [uploadingPfp, setUploadingPfp] = useState(false);

  React.useEffect(() => {
    if (!user || hydrated) return;
    if (user.notificationPreferences) {
      setPushEnabled(user.notificationPreferences.push);
    }
    setHydrated(true);
  }, [user, hydrated]);

  const savePreferences = async (push: boolean) => {
    try {
      await updatePreferences({
        notificationPreferences: {
          push,
          sms: user?.notificationPreferences?.sms ?? false,
          email: user?.notificationPreferences?.email ?? false,
        },
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to save preferences:', error);
    }
  };

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

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) await performSignOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: performSignOut },
      ]);
    }
  };

  const performSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (__DEV__) console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <User size={20} color={colors.green} />
            <Text style={styles.headerTitle}>Pilot Protocol</Text>
          </View>
          <View style={styles.settingsButton}>
            <Settings size={20} color={colors.textSecondary} />
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangeProfilePhoto}
            activeOpacity={0.7}
            disabled={uploadingPfp}
          >
            {uploadingPfp ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <User size={36} color={colors.textTertiary} strokeWidth={1.5} />
            )}
            <View style={styles.avatarEditBadge}>
              <Camera size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Pilot'}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{levelLabel}</Text>
            </View>
            <Text style={styles.memberId}>
              {memberSince ? `SINCE ${memberSince}` : ''}
              {isPro ? '  //  PRO' : '  //  FREE'}
            </Text>
          </View>
          {isPro && (
            <View style={styles.proBadge}>
              <Crown size={14} color="#FFD700" />
            </View>
          )}
        </View>

        {/* ── Subscription Banner ── */}
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
            activeOpacity={0.8}
          >
            <Crown size={18} color="#FFD700" />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeBannerTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeBannerSubtitle}>Unlock AI plans, inspections & parts lists</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* ── Hangar / Active Units ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Bike size={18} color={colors.green} />
            <Text style={styles.sectionTitle}>Hangar / Active Units</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/add-bike' as any)} activeOpacity={0.7}>
            <Text style={styles.registerUnit}>+ Register Unit</Text>
          </TouchableOpacity>
        </View>

        {bikes.length === 0 ? (
          <View style={styles.emptyHangar}>
            <Bike size={32} color={colors.textTertiary} />
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
            <TouchableOpacity
              key={bike._id}
              style={[styles.bikeCard, index === 0 && styles.bikeCardPrimary]}
              onPress={() => router.push(`/bike/${bike._id}` as any)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bikeName}>{bike.make} {bike.model}</Text>
                <Text style={[styles.bikeSubtitle, index === 0 && { color: colors.green }]}>
                  {index === 0 ? 'Primary Unit' : 'Unit'} // {bike.year} Model
                </Text>
                <View style={styles.bikeStatsRow}>
                  <View style={styles.bikeStat}>
                    <Text style={styles.bikeStatLabel}>Mileage</Text>
                    <Text style={styles.bikeStatValue}>{bike.mileage?.toLocaleString() ?? '—'}</Text>
                  </View>
                  <View style={styles.bikeStat}>
                    <Text style={styles.bikeStatLabel}>Status</Text>
                    <Text style={[styles.bikeStatValue, { color: colors.green }]}>Deployed</Text>
                  </View>
                </View>
              </View>
              <View style={styles.bikeCardRight}>
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleChangePhoto(bike._id);
                  }}
                  activeOpacity={0.7}
                  disabled={uploadingBikeId === bike._id}
                >
                  {uploadingBikeId === bike._id ? (
                    <ActivityIndicator size={14} color={colors.green} />
                  ) : (
                    <Camera size={14} color={colors.green} />
                  )}
                  <Text style={styles.changePhotoText}>
                    {uploadingBikeId === bike._id ? 'Uploading...' : 'Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Service History ── */}
        <TouchableOpacity
          style={styles.serviceHistoryButton}
          onPress={() => router.push('/service-history' as any)}
          activeOpacity={0.7}
        >
          <FileText size={18} color={colors.green} />
          <Text style={styles.serviceHistoryButtonText}>Service History</Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* ── Control Parameters ── */}
        <Text style={styles.controlTitle}>Control Parameters</Text>

        <View style={styles.controlCard}>
          <View style={styles.controlRow}>
            <Bell size={18} color={colors.orange} />
            <Text style={styles.controlLabel}>Critical Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={(val) => {
                setPushEnabled(val);
                savePreferences(val);
              }}
              trackColor={{ false: colors.surface2, true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.controlDivider} />

          <View style={styles.controlRow}>
            <Settings size={18} color={colors.textSecondary} />
            <Text style={styles.controlLabel}>Unit Calibration</Text>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>Metric (KM/L)</Text>
            </View>
          </View>

          <View style={styles.controlDivider} />

          <TouchableOpacity style={styles.controlRow} activeOpacity={0.7}>
            <Shield size={18} color={colors.blue} />
            <Text style={styles.controlLabel}>Encryption & Safety</Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Bottom Actions ── */}
        <TouchableOpacity style={styles.supportButton} activeOpacity={0.7}>
          <MessageSquare size={18} color={colors.textSecondary} />
          <Text style={styles.supportButtonText}>Support Terminal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, isSigningOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size={18} color={colors.red} />
          ) : (
            <LogOut size={18} color={colors.red} />
          )}
          <Text style={styles.logoutButtonText}>
            {isSigningOut ? 'Signing Out...' : 'Logout Session'}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Apex v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 20, paddingBottom: 120, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  settingsButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(26,26,46,0.4)', alignItems: 'center', justifyContent: 'center',
  },

  // Profile card
  profileCard: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarContainer: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 16,
    overflow: 'visible',
  },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  levelBadge: {
    backgroundColor: colors.surface2, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  levelBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  memberId: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.5 },
  proBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.15)', alignItems: 'center', justifyContent: 'center',
  },

  // Upgrade banner
  upgradeBanner: {
    backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  upgradeBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  upgradeBannerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  manageSubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  manageSubText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  registerUnit: { fontSize: 13, fontWeight: '600', color: colors.green },

  // Empty hangar
  emptyHangar: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
  },
  emptyHangarText: { fontSize: 14, color: colors.textSecondary },
  addBikeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  addBikeButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Bike card
  bikeCard: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  bikeCardPrimary: { borderColor: colors.green },
  bikeName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  bikeSubtitle: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 10 },
  bikeStatsRow: { flexDirection: 'row', gap: 24 },
  bikeStat: { gap: 1 },
  bikeStatLabel: { fontSize: 11, fontWeight: '500', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  bikeStatValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  bikeCardRight: { marginLeft: 12, alignItems: 'center', gap: 8 },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,229,153,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,153,0.25)',
  },
  changePhotoText: { fontSize: 12, fontWeight: '600', color: colors.green },

  // Control parameters
  controlTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  controlCard: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  controlRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 12,
  },
  controlLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  controlDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 46 },
  metricBadge: {
    backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  metricBadgeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  // Service history
  serviceHistoryButton: {
    backgroundColor: 'rgba(0,229,153,0.08)', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(0,229,153,0.15)',
  },
  serviceHistoryButtonText: { fontSize: 15, fontWeight: '600', color: colors.green, flex: 1 },

  // Bottom actions
  supportButton: {
    backgroundColor: 'rgba(26,26,46,0.4)', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  supportButtonText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  logoutButton: {
    backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)',
  },
  logoutButtonText: { fontSize: 15, fontWeight: '600', color: colors.red },

  version: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
