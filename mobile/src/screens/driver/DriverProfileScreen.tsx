import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { StatusPill } from '../../components/StatusPill';
import { ENV } from '../../config/env';
import { Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPrivacyPreferences,
  loadPrivacyPreferences,
  updatePrivacyPreferences,
  type PrivacyPreferences,
} from '../../services/analyticsGuard';
import { api } from '../../services/api';
import { getLocalRideHistory } from '../../services/secureStorage';
import { useResponsive } from '../../utils/responsive';

export const DriverProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [regNumber, setRegNumber] = useState(user?.vehicle?.registrationNumber || '');
  const [carModel, setCarModel] = useState(user?.vehicle?.model || '');
  const [carColour, setCarColour] = useState(user?.vehicle?.colour || '');
  const [saving, setSaving] = useState(false);
  const [rideHistory, setRideHistory] = useState<
    Array<{
      id: string;
      status: string;
      startTime: string;
      endTime?: string | null;
      pickupAddress?: string | null;
      destinationAddress?: string | null;
    }>
  >([]);
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPreferences>(getPrivacyPreferences());

  const loadHistory = async () => {
    const local = await getLocalRideHistory();
    try {
      const res = await api.get('/rides/history');
      const serverRows = res.data?.data || [];
      setRideHistory(serverRows.length > 0 ? serverRows : local);
    } catch {
      setRideHistory(local);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadPrivacyPreferences(user.id).then(setPrivacyPrefs);
      loadHistory();
    }
  }, [user?.id]);

  const togglePrivacy = async (key: keyof PrivacyPreferences, value: boolean) => {
    const next = { ...privacyPrefs, [key]: value };
    setPrivacyPrefs(next);
    if (user?.id) {
      await updatePrivacyPreferences(user.id, next);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/compliance/my-data');
      const ridesCount = res.data?.data?.recentRides?.length ?? 0;
      Alert.alert(
        'Personal Data Exported',
        `Profile, consent records, and ${ridesCount} recent ride(s) retrieved from server.`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || 'Unable to export data.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your driver profile, ride history, and location records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/compliance/account');
              await logout();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.response?.data?.message || 'Unable to delete account.');
            }
          },
        },
      ]
    );
  };

  const openLegalDoc = (path: '/privacy-policy' | '/terms-and-conditions') => {
    const base = ENV.API_URL.replace(/\/api\/?$/, '');
    Linking.openURL(`${base}${path}`).catch(() => {});
  };

  const handleWithdrawConsent = () => {
    Alert.alert(
      'Withdraw DPDP Consent',
      'Withdrawing consent will suspend data processing and sign you out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/compliance/consent/withdraw', {});
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Unable to withdraw consent.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    try {
      const hasVehicle = regNumber.trim() && carModel.trim() && carColour.trim();
      await api.patch(`/drivers/${user.id}`, {
        fullName: fullName.trim(),
        ...(hasVehicle
          ? {
              vehicle: {
                registrationNumber: regNumber.trim(),
                model: carModel.trim(),
                colour: carColour.trim(),
              },
            }
          : {}),
      });
      updateUser({
        ...user,
        fullName: fullName.trim(),
        vehicle: hasVehicle
          ? {
              id: user.vehicle?.id || 'updated',
              registrationNumber: regNumber.trim(),
              model: carModel.trim(),
              colour: carColour.trim(),
            }
          : user.vehicle,
      });
      setEditing(false);
      Alert.alert('Profile Updated', 'Your profile and vehicle details have been updated.');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: horizontalPadding, paddingTop: Math.max(insets.top, 18) },
      ]}
    >
      <View style={styles.heroCard}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{(user?.fullName || 'DR').slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.name, { fontSize: scaleFont(22) }]}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.mobileNumber}</Text>
        <StatusPill
          icon="check-circle"
          label={`Verified • ${user?.accountStatus || 'ACTIVE'}`}
          tone="success"
        />
      </View>

      <View style={[styles.card, Theme.shadow.card]}>
        <View style={styles.cardHeader}>
          <AppIcon name="car" size={18} color={Theme.colors.text} />
          <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
        </View>
        <InfoRow label="Registration" value={user?.vehicle?.registrationNumber || 'Not Assigned'} />
        <View style={styles.divider} />
        <InfoRow label="Model" value={user?.vehicle?.model || '-'} />
        <View style={styles.divider} />
        <InfoRow label="Colour" value={user?.vehicle?.colour || '-'} />
      </View>

      <View style={[styles.card, Theme.shadow.card]}>
        <View style={styles.cardHeader}>
          <AppIcon name="settings" size={18} color={Theme.colors.text} />
          <Text style={styles.sectionTitle}>Profile Settings</Text>
        </View>
        {editing ? (
          <>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Full Name" style={styles.input} />
            <TextInput
              value={regNumber}
              onChangeText={setRegNumber}
              placeholder="Vehicle Registration (e.g. MH-12-AB-1234)"
              style={styles.input}
            />
            <TextInput value={carModel} onChangeText={setCarModel} placeholder="Vehicle Model (e.g. Swift Dzire)" style={styles.input} />
            <TextInput value={carColour} onChangeText={setCarColour} placeholder="Vehicle Colour (e.g. White)" style={styles.input} />
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.blackBtn, styles.actionBtn]}>
                <Text style={styles.blackBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[styles.secondaryBtn, styles.actionBtn]}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.blackBtn}>
            <Text style={styles.blackBtnText}>Edit Profile &amp; Vehicle</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.card, Theme.shadow.card]}>
        <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="clock" size={18} color={Theme.colors.text} />
            <Text style={styles.sectionTitle}>Ride History</Text>
          </View>
          <TouchableOpacity onPress={loadHistory}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: Theme.colors.primary }}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {rideHistory.length === 0 ? (
          <Text style={styles.infoLabel}>No rides recorded yet.</Text>
        ) : (
          rideHistory.slice(0, 10).map((item) => (
            <View key={item.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Theme.colors.border }}>
              <Text style={styles.infoVal}>
                {(item.pickupAddress || 'GPS Start') + (item.destinationAddress ? ` → ${item.destinationAddress}` : '')}
              </Text>
              <Text style={styles.infoLabel}>
                {item.status === 'RIDE_STARTED' ? 'Active' : 'Completed'} • {new Date(item.startTime).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, Theme.shadow.card]}>
        <View style={styles.cardHeader}>
          <AppIcon name="shield" size={18} color={Theme.colors.text} />
          <Text style={styles.sectionTitle}>Privacy &amp; Consent</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Non-Essential Analytics</Text>
          <TouchableOpacity
            onPress={() => togglePrivacy('analyticsConsent', !privacyPrefs.analyticsConsent)}
            style={privacyPrefs.analyticsConsent ? styles.toggleOn : styles.toggleOff}
          >
            <Text style={privacyPrefs.analyticsConsent ? styles.toggleTextOn : styles.toggleTextOff}>
              {privacyPrefs.analyticsConsent ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Session Replay</Text>
          <TouchableOpacity
            onPress={() => togglePrivacy('sessionReplayConsent', !privacyPrefs.sessionReplayConsent)}
            style={privacyPrefs.sessionReplayConsent ? styles.toggleOn : styles.toggleOff}
          >
            <Text style={privacyPrefs.sessionReplayConsent ? styles.toggleTextOn : styles.toggleTextOff}>
              {privacyPrefs.sessionReplayConsent ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleExportData} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Export My Personal Data</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWithdrawConsent} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Withdraw DPDP Consent</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteAccount} style={styles.secondaryBtn}>
          <Text style={[styles.secondaryBtnText, { color: Theme.colors.error }]}>Delete My Account</Text>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openLegalDoc('/privacy-policy')} style={[styles.secondaryBtn, styles.actionBtn]}>
            <Text style={styles.secondaryBtnText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('/terms-and-conditions')} style={[styles.secondaryBtn, styles.actionBtn]}>
            <Text style={styles.secondaryBtnText}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoVal}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingVertical: 18, gap: 14, flexGrow: 1 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 20,
    gap: 8,
  },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  name: { fontWeight: '800', color: Theme.colors.text, textAlign: 'center', marginTop: 4 },
  phone: { fontSize: 14, color: Theme.colors.textSecondary },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Theme.colors.text },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  infoLabel: { fontSize: 14, color: Theme.colors.textSecondary },
  infoVal: { fontSize: 14, fontWeight: '700', color: Theme.colors.text, flexShrink: 1 },
  divider: { height: 1, backgroundColor: Theme.colors.border },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Theme.colors.text,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: 110 },
  blackBtn: {
    minHeight: 48,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  blackBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    minHeight: 48,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: Theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: { color: Theme.colors.text, fontWeight: '700', fontSize: 14 },
  toggleOn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleOff: {
    backgroundColor: Theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleTextOn: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  toggleTextOff: { color: Theme.colors.textSecondary, fontWeight: '700', fontSize: 12 },
  logoutBtn: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#FEE2E2',
    borderRadius: Theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: Theme.colors.error, fontWeight: '800', fontSize: 15 },
});
