import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useResponsive } from '../../utils/responsive';

export const DriverProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { horizontalPadding, isSmallPhone, scaleFont } = useResponsive();
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
      <View style={[styles.headerRow, isSmallPhone && styles.wrapRow]}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{(user?.fullName || 'DR').slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.flexText}>
          <Text style={[styles.name, { fontSize: scaleFont(20) }]}>{user?.fullName}</Text>
          <Text style={styles.phone}>{user?.mobileNumber}</Text>
          <Text style={styles.status}>Account: {user?.accountStatus || 'ACTIVE'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
        <Text style={styles.rowText}>Registration: {user?.vehicle?.registrationNumber || 'Not Assigned'}</Text>
        <Text style={styles.rowText}>Model: {user?.vehicle?.model || '-'}</Text>
        <Text style={styles.rowText}>Colour: {user?.vehicle?.colour || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Edit Permitted Details</Text>
        {editing ? (
          <>
            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, styles.actionBtn]}>
                <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[styles.btn, styles.actionBtn, { backgroundColor: Theme.colors.border }]}
              >
                <Text style={[styles.btnText, { color: Theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.btn}>
            <Text style={styles.btnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingVertical: 16, gap: 16, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 },
  wrapRow: { flexWrap: 'wrap' },
  flexText: { flex: 1, flexShrink: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  name: { fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  phone: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 2, flexShrink: 1 },
  status: { fontSize: 13, color: Theme.colors.green, fontWeight: '700', marginTop: 2 },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  rowText: { fontSize: 14, color: Theme.colors.text, flexShrink: 1 },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Theme.colors.text,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: 110 },
  btn: {
    minHeight: 48,
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  logoutBtn: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
