import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Mail, Shield, Phone, Bell } from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(api.users.getCurrent);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const sendTestNotification = useAction(api.notifications.sendTest);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [imageLoadError, setImageLoadError] = React.useState(false);
  const [testingSms, setTestingSms] = React.useState(false);
  const [testingEmail, setTestingEmail] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [smsEnabled, setSmsEnabled] = React.useState(false);
  const [emailEnabled, setEmailEnabled] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Reset image error state when user image URL changes
    setImageLoadError(false);
  }, [user?.imageUrl]);

  // Hydrate local state from backend
  React.useEffect(() => {
    if (!convexUser || hydrated) return;
    if (convexUser.phone) setPhoneNumber(convexUser.phone);
    if (convexUser.notificationPreferences) {
      setPushEnabled(convexUser.notificationPreferences.push);
      setSmsEnabled(convexUser.notificationPreferences.sms);
      setEmailEnabled(convexUser.notificationPreferences.email);
    }
    setHydrated(true);
  }, [convexUser, hydrated]);

  const savePreferences = React.useCallback(
    async (overrides?: { push?: boolean; sms?: boolean; email?: boolean; phone?: string }) => {
      try {
        await updatePreferences({
          phone: (overrides?.phone ?? phoneNumber) || undefined,
          notificationPreferences: {
            push: overrides?.push ?? pushEnabled,
            sms: overrides?.sms ?? smsEnabled,
            email: overrides?.email ?? emailEnabled,
          },
        });
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    },
    [pushEnabled, smsEnabled, emailEnabled, phoneNumber, updatePreferences]
  );

  const handleSendTest = async (channel: 'sms' | 'email') => {
    const setter = channel === 'sms' ? setTestingSms : setTestingEmail;
    setter(true);
    try {
      await sendTestNotification({ channel });
      if (Platform.OS === 'web') {
        window.alert(`Test ${channel.toUpperCase()} sent!`);
      } else {
        Alert.alert('Sent!', `Test ${channel.toUpperCase()} sent successfully.`);
      }
    } catch (error: any) {
      const msg = error?.message || 'Something went wrong';
      if (Platform.OS === 'web') {
        window.alert(`Failed: ${msg}`);
      } else {
        Alert.alert('Failed', msg);
      }
    } finally {
      setter(false);
    }
  };

  const handleSignOut = async () => {
    console.log("Sign out button pressed");
    
    // For web, use window.confirm; for native, use Alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) {
        await performSignOut();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  const performSignOut = async () => {
    console.log("Confirming sign out");
    setIsSigningOut(true);
    try {
      console.log("Starting sign out process");
      
      // Clear any cached tokens first
      try {
        await Promise.all([
          SecureStore.deleteItemAsync("__clerk_client_jwt"),
          SecureStore.deleteItemAsync("__clerk_db_jwt"),
          SecureStore.deleteItemAsync("__clerk_session_jwt"),
        ]);
        console.log("Tokens cleared");
      } catch (tokenError) {
        console.log("Token cleanup error (ignorable):", tokenError);
      }
      
      // Sign out from Clerk - this will trigger the automatic redirect in _layout.tsx
      await signOut();
      console.log("Clerk sign out completed - automatic redirect should happen");
      
    } catch (error) {
      console.error("Sign out error:", error);
      if (Platform.OS === 'web') {
        window.alert("Failed to sign out. Please try again.");
      } else {
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {user?.imageUrl && !imageLoadError ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                  onError={() => {
                    console.log('Profile image failed to load');
                    setImageLoadError(true);
                  }}
                />
              ) : (
                <User size={32} color="#6B7280" strokeWidth={1.5} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'}
              </Text>
              <View style={styles.profileDetail}>
                <Mail size={14} color="#9CA3AF" strokeWidth={2} />
                <Text style={styles.profileEmail}>
                  {user?.primaryEmailAddress?.emailAddress || 'No email'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.phoneRow}>
            <Phone size={16} color="#6B7280" strokeWidth={2} />
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onEndEditing={() => savePreferences({ phone: phoneNumber })}
              placeholder="Add phone number for SMS"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Shield size={20} color="#6B7280" strokeWidth={2} />
            <Text style={styles.menuText}>Privacy & Security</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.signOutItem, isSigningOut && styles.disabledItem]}
            onPress={() => {
              console.log("TouchableOpacity pressed, isSigningOut:", isSigningOut);
              if (!isSigningOut) {
                handleSignOut();
              }
            }}
            activeOpacity={0.7}
          >
            {isSigningOut ? (
              <ActivityIndicator size={20} color="#EF4444" />
            ) : (
              <LogOut size={20} color="#EF4444" strokeWidth={2} />
            )}
            <Text style={[styles.menuText, styles.signOutText]}>
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <Bell size={20} color="#6B7280" strokeWidth={2} />
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Switch
                value={pushEnabled}
                onValueChange={(val) => {
                  setPushEnabled(val);
                  savePreferences({ push: val });
                }}
                trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleDivider} />

            <View style={styles.toggleRow}>
              <Phone size={20} color={!phoneNumber.trim() ? '#D1D5DB' : '#6B7280'} strokeWidth={2} />
              <Text style={[styles.toggleLabel, !phoneNumber.trim() && { color: '#9CA3AF' }]}>SMS Notifications</Text>
              <Switch
                value={smsEnabled}
                onValueChange={(val) => {
                  setSmsEnabled(val);
                  savePreferences({ sms: val });
                }}
                disabled={!phoneNumber.trim()}
                trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                thumbColor="#FFFFFF"
              />
            </View>
            {!phoneNumber.trim() && (
              <Text style={styles.smsHint}>Add a phone number above to enable SMS</Text>
            )}

            <View style={styles.toggleDivider} />

            <View style={styles.toggleRow}>
              <Mail size={20} color="#6B7280" strokeWidth={2} />
              <Text style={styles.toggleLabel}>Email Notifications</Text>
              <Switch
                value={emailEnabled}
                onValueChange={(val) => {
                  setEmailEnabled(val);
                  savePreferences({ email: val });
                }}
                trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.testButtonRow}>
            <TouchableOpacity
              style={[styles.testButton, (!smsEnabled || !phoneNumber.trim()) && styles.testButtonDisabled]}
              disabled={!smsEnabled || !phoneNumber.trim() || testingSms}
              onPress={() => handleSendTest('sms')}
              activeOpacity={0.7}
            >
              {testingSms ? (
                <ActivityIndicator size={14} color="#6B7280" />
              ) : (
                <Phone size={14} color={smsEnabled && phoneNumber.trim() ? '#6B7280' : '#D1D5DB'} strokeWidth={2} />
              )}
              <Text style={[styles.testButtonText, (!smsEnabled || !phoneNumber.trim()) && { color: '#D1D5DB' }]}>
                Test SMS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, !emailEnabled && styles.testButtonDisabled]}
              disabled={!emailEnabled || testingEmail}
              onPress={() => handleSendTest('email')}
              activeOpacity={0.7}
            >
              {testingEmail ? (
                <ActivityIndicator size={14} color="#6B7280" />
              ) : (
                <Mail size={14} color={emailEnabled ? '#6B7280' : '#D1D5DB'} strokeWidth={2} />
              )}
              <Text style={[styles.testButtonText, !emailEnabled && { color: '#D1D5DB' }]}>
                Test Email
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            ApexTune v1.0.0
          </Text>
          <Text style={styles.sectionText}>
            Built with Expo, Convex, and Clerk
          </Text>
          <Text style={styles.sectionText}>
            Real-time sync across all your devices
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  profileSection: {
    marginBottom: 32,
  },
  profileCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  signOutItem: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    color: '#EF4444',
  },
  disabledItem: {
    opacity: 0.6,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 10,
  },
  toggleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 48,
  },
  smsHint: {
    fontSize: 12,
    color: '#9CA3AF',
    paddingLeft: 48,
    paddingBottom: 8,
  },
  testButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testButtonDisabled: {
    opacity: 0.4,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
});