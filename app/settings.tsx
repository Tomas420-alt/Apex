import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import {
  ArrowLeft,
  Bell,
  Gauge,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  LogOut,
  Trash2,
  FileText,
  Scale,
  UserPen,
} from 'lucide-react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
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

// ─── Section components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SettingsRow({
  icon,
  label,
  right,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={styles.settingsRow}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      {icon}
      <Text style={[styles.settingsLabel, destructive && { color: colors.red }]}>{label}</Text>
      {right || (onPress && <ChevronRight size={18} color={colors.textTertiary} />)}
    </Wrapper>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrent);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const updateName = useMutation(api.users.updateName);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const { width: sw, height: sh } = useWindowDimensions();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      setShowDeleteModal(false);
      await signOut();
    } catch (error) {
      if (__DEV__) console.error('Failed to delete account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSupport = async () => {
    const mailto = 'mailto:apextune.app@gmail.com?subject=Apex%20Support%20Request';
    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      Linking.openURL(mailto);
    } else {
      Alert.alert(
        'Contact Support',
        'Email us at apextune.app@gmail.com with your issue and we\'ll get back to you within 24 hours.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Background w={sw} h={sh} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            System <Text style={{ color: colors.green }}>Settings</Text>
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Control Parameters ── */}
          <SectionTitle>Control Parameters</SectionTitle>
          <View style={styles.card}>
            <SettingsRow
              icon={<Bell size={18} color={colors.textTertiary} />}
              label="Critical Notifications"
              right={
                <Switch
                  value={pushEnabled}
                  onValueChange={(val) => { setPushEnabled(val); savePreferences(val); }}
                  trackColor={{ false: colors.surface2, true: colors.green }}
                  thumbColor="#000000"
                />
              }
            />
            <Divider />
            <SettingsRow
              icon={<Gauge size={18} color={colors.textTertiary} />}
              label="Unit Calibration"
              right={
                <View style={styles.metricBadgeRow}>
                  <Text style={styles.metricBadgeText}>Metric (KM)</Text>
                  <ChevronDown size={14} color={colors.textTertiary} />
                </View>
              }
            />
          </View>

          {/* ── Security & Privacy ── */}
          <SectionTitle>Security & Privacy</SectionTitle>
          <View style={styles.card}>
            <SettingsRow
              icon={<ShieldCheck size={18} color={colors.textTertiary} />}
              label="Encryption & Safety"
              onPress={() => {
                Alert.alert(
                  'Encryption & Safety',
                  'All data is encrypted in transit (TLS 1.3) and at rest. Your maintenance data is stored securely on Convex cloud infrastructure. Authentication is handled via industry-standard JWT tokens.',
                  [{ text: 'OK' }]
                );
              }}
            />
            <Divider />
            <SettingsRow
              icon={<FileText size={18} color={colors.textTertiary} />}
              label="Privacy Policy"
              onPress={() => setShowPrivacy(true)}
            />
            <Divider />
            <SettingsRow
              icon={<Scale size={18} color={colors.textTertiary} />}
              label="Terms of Service"
              onPress={() => setShowTerms(true)}
            />
          </View>

          {/* ── Account ── */}
          <SectionTitle>Account</SectionTitle>
          <View style={styles.card}>
            <SettingsRow
              icon={<UserPen size={18} color={colors.textTertiary} />}
              label="Edit Profile Name"
              onPress={() => {
                setEditNameValue(user?.name || '');
                setShowEditName(true);
              }}
            />
          </View>

          {/* ── Support ── */}
          <SectionTitle>Support</SectionTitle>
          <View style={styles.card}>
            <SettingsRow
              icon={<MessageSquare size={18} color={colors.textTertiary} />}
              label="Support Terminal"
              onPress={handleSupport}
            />
          </View>

          {/* ── Session ── */}
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

          {/* ── Danger Zone ── */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={colors.red} />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Apex v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      {/* ── Delete Account Modal ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={styles.modalInner}>
              <Trash2 size={28} color={colors.red} style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.modalDesc}>
                This will permanently delete your account and all data including bikes, maintenance plans, tasks, parts, and service history. This action cannot be undone.
              </Text>
              <Text style={styles.modalConfirmLabel}>
                Type <Text style={{ fontWeight: '800', color: colors.red }}>delete</Text> to confirm:
              </Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="delete"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalDeleteBtn, deleteConfirmText.toLowerCase() !== 'delete' && { opacity: 0.4 }]}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.7}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete Forever</Text>
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Privacy Policy Modal ── */}
      <Modal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPrivacy(false)}>
          <Pressable style={[styles.modalCard, { maxWidth: 380, width: '92%' }]} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={styles.modalInner}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.legalText}>
                  <Text style={styles.legalHeading}>{'Last Updated: April 2, 2026\n\n'}</Text>
                  <Text style={styles.legalHeading}>{'1. Information We Collect\n'}</Text>
                  {'Apex collects the following information when you use our app:\n• Account information (name, email) via Apple Sign-In\n• Motorcycle details you provide (make, model, year, mileage)\n• Maintenance records and inspection data\n• Subscription status\n• Device push notification tokens\n\n'}
                  <Text style={styles.legalHeading}>{'2. How We Use Your Data\n'}</Text>
                  {'Your data is used exclusively to:\n• Generate personalized AI maintenance plans\n• Track your service history and upcoming tasks\n• Send maintenance reminders (if enabled)\n• Process your subscription\n\n'}
                  <Text style={styles.legalHeading}>{'3. Data Storage & Security\n'}</Text>
                  {'All data is encrypted in transit (TLS 1.3) and stored securely on Convex cloud infrastructure. We do not sell, share, or transfer your personal data to third parties except as required to operate the service.\n\n'}
                  <Text style={styles.legalHeading}>{'4. Third-Party Services\n'}</Text>
                  {'We use the following third-party services:\n• Convex (database & backend)\n• RevenueCat (subscription management)\n• OpenAI (AI maintenance plan generation — anonymized data only)\n\n'}
                  <Text style={styles.legalHeading}>{'5. Data Deletion\n'}</Text>
                  {'You can delete your account and all associated data at any time from Settings > Delete Account. This action is permanent and cannot be undone.\n\n'}
                  <Text style={styles.legalHeading}>{'6. Contact\n'}</Text>
                  {'For privacy concerns, contact us at apextune.app@gmail.com.'}
                </Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setShowPrivacy(false)} activeOpacity={0.7}>
                <Text style={styles.modalSaveText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Terms of Service Modal ── */}
      <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTerms(false)}>
          <Pressable style={[styles.modalCard, { maxWidth: 380, width: '92%' }]} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={styles.modalInner}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.legalText}>
                  <Text style={styles.legalHeading}>{'Last Updated: April 2, 2026\n\n'}</Text>
                  <Text style={styles.legalHeading}>{'1. Acceptance of Terms\n'}</Text>
                  {'By using Apex, you agree to these Terms of Service. If you do not agree, do not use the app.\n\n'}
                  <Text style={styles.legalHeading}>{'2. Description of Service\n'}</Text>
                  {'Apex provides AI-generated motorcycle maintenance plans, task tracking, parts recommendations, and service history logging. Plans are generated suggestions and should not replace manufacturer service manuals or professional mechanic advice.\n\n'}
                  <Text style={styles.legalHeading}>{'3. Subscriptions\n'}</Text>
                  {'• Apex Pro is available as a monthly or yearly auto-renewing subscription\n• Payment is charged to your Apple ID account at purchase confirmation\n• Subscription auto-renews unless cancelled at least 24 hours before the end of the current period\n• You can manage or cancel subscriptions in your Apple ID Settings\n\n'}
                  <Text style={styles.legalHeading}>{'4. Disclaimer\n'}</Text>
                  {'AI-generated maintenance plans are recommendations only. Apex is not liable for any damage, injury, or mechanical failure resulting from following or not following suggested maintenance schedules. Always consult your motorcycle manufacturer\'s service manual.\n\n'}
                  <Text style={styles.legalHeading}>{'5. Account Termination\n'}</Text>
                  {'You may delete your account at any time. We reserve the right to suspend accounts that violate these terms.\n\n'}
                  <Text style={styles.legalHeading}>{'6. Contact\n'}</Text>
                  {'Questions about these terms? Contact apextune.app@gmail.com.'}
                </Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setShowTerms(false)} activeOpacity={0.7}>
                <Text style={styles.modalSaveText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Edit Name Modal ── */}
      <Modal visible={showEditName} transparent animationType="fade" onRequestClose={() => setShowEditName(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditName(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <BlurView intensity={40} tint="dark" style={styles.modalInner}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editNameValue}
                onChangeText={setEditNameValue}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowEditName(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, !editNameValue.trim() && { opacity: 0.4 }]}
                  onPress={async () => {
                    if (editNameValue.trim()) {
                      try {
                        await updateName({ name: editNameValue.trim() });
                      } catch (error) {
                        if (__DEV__) console.error('Failed to update name:', error);
                        Alert.alert('Error', 'Failed to update name.');
                      }
                    }
                    setShowEditName(false);
                  }}
                  activeOpacity={0.7}
                  disabled={!editNameValue.trim()}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(18,18,18,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 16,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 8,
  },

  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: 'rgba(255,255,255,0.03)',
  } as any,

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  } as any,
  settingsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 54,
  },

  metricBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },

  logoutButton: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.red,
  },

  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.15)',
    borderStyle: 'dashed',
  } as any,
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
    opacity: 0.8,
  },

  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '85%',
    maxWidth: 340,
    overflow: 'hidden',
    backgroundColor: colors.surface1,
  } as any,
  modalInner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalConfirmLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.surface2,
    alignItems: 'center',
  } as any,
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.red,
    alignItems: 'center',
  } as any,
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.green,
    alignItems: 'center',
  } as any,
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },

  // Legal text
  legalText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  legalHeading: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
