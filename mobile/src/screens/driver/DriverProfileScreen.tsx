import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { StatusPill } from '../../components/StatusPill';
import { Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useResponsive } from '../../utils/responsive';

export const DriverProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { horizontalPadding, scaleFont } = useResponsive();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/drivers/${user.id}`, { fullName: fullName.trim() });
      updateUser({ ...user, fullName: fullName.trim() });
      setEditing(false);
      Alert.alert('Profile Updated', 'Your name has been updated.');
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
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
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
            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />
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
            <Text style={styles.blackBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
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
