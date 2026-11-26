import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../utils/responsive';

export const AdminProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { horizontalPadding, scaleFont } = useResponsive();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      <View style={styles.card}>
        <Text style={[styles.name, { fontSize: scaleFont(19) }]}>{user?.fullName}</Text>
        <Text style={styles.meta}>{user?.mobileNumber}</Text>
        <Text style={styles.role}>Role: Administrator</Text>
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
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    gap: 6,
  },
  name: { fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  meta: { fontSize: 14, color: Theme.colors.textMuted, flexShrink: 1 },
  role: { fontSize: 13, fontWeight: '700', color: Theme.colors.primary },
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
