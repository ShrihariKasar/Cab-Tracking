import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { StatusPill } from '../../components/StatusPill';
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
      <View style={[styles.heroCard, Theme.shadow.card]}>
        <View style={styles.avatar}>
          <AppIcon name="shield" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.name, { fontSize: scaleFont(20) }]}>{user?.fullName}</Text>
        <Text style={styles.meta}>{user?.mobileNumber}</Text>
        <StatusPill icon="check-circle" label="Fleet Administrator" tone="neutral" />
      </View>

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingVertical: 20, gap: 16, flexGrow: 1 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 24,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '800', color: Theme.colors.text, textAlign: 'center', marginTop: 4 },
  meta: { fontSize: 14, color: Theme.colors.textSecondary },
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
